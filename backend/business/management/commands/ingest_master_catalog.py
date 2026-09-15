import csv
import json
import logging
import os
import re
import urllib.request
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from business.models import MasterCatalogProduct, Product
from business.starter_catalog import RUBRO_PRESETS

logger = logging.getLogger(__name__)

KNOWN_BRANDS = [
    "La Virginia", "Green Hills", "Crysf", "La Morenita", "Taragüi", "Playadito",
    "Amanda", "Rosamonte", "Cruz de Malta", "CBSé", "Cachamai", "Cachamate",
    "La Merced", "Mañanita", "Unión", "Chamigo", "Verdeflor", "Romance", "Andresito",
    "Don Satur", "9 de Oro", "Terepín", "Gaona", "Trio", "Fachitas", "Dulcipan",
    "Oreo", "Rumba", "Chocolinas", "Sonrisas", "Melba", "Merengadas", "Amor", "Mellizas",
    "Traviata", "Criollitas", "Express", "Mediatarde", "Club Social", "Saladix",
    "Rex", "Twistos", "Lay's", "Doritos", "Cheetos", "Pehuamar", "Krachitos",
    "Guaymallén", "Jorgito", "Jorgelín", "Capitán del Espacio", "Milka", "Águila",
    "Rasta", "Fantoche", "Tatín", "Grandote", "Fulbito", "Escolar", "Bon o Bon",
    "Block", "Tita", "Rhodesia", "Mantecol", "Cofler", "Sugus", "Flynn Paff",
    "Palitos de la Selva", "Beldent", "Topline", "Mogul", "Halls",
    "Coca Cola", "Sprite", "Fanta", "Pepsi", "7Up", "Paso de los Toros",
    "Manaos", "Cunnington", "Secco", "Pritty", "Villavicencio", "Villa del Sur",
    "Levité", "Aquarius", "Terma", "Cepita", "Baggio", "Ades", "Speed",
    "Monster", "Red Bull", "Gatorade", "Powerade",
    "Quilmes", "Brahma", "Stella Artois", "Heineken", "Corona", "Andes",
    "Imperial", "Schneider", "Budweiser", "Fernet Branca", "1882", "Gancia",
    "Campari", "Aperol", "Cynar", "Cinzano", "Smirnoff", "Skyy", "Bombay",
    "Heredero", "Toro", "Termidor", "Uvita", "Norton", "Santa Julia",
    "Alma Mora", "Cordero con Piel de Lobo", "Dadá", "Chandon",
    "Marlboro", "Philip Morris", "Chesterfield", "Lucky Strike", "Camel", "Rothmans", "Red Point",
    "Arcor", "Molinos", "Bagley", "Terrabusi", "Marolio", "Noel", "Cica", "Knorr",
    "Maggi", "Matarazzo", "Lucchetti", "Favorita", "Morixe", "Cañuelas", "Natura",
    "Cocinero", "Lira", "Pureza", "La Serenísima", "Sancor", "Ilolay", "Tregar",
    "Milkaut", "Barraza", "Paladini", "Cagnoli", "Vienísima", "Paty", "Swift",
    "Ala", "Skip", "Drive", "Ariel", "Zorro", "Magistral", "Cif", "Ayudín",
    "Querubín", "Procenex", "Poett", "Lysoform", "Raid", "Fuyi", "Blem", "Mr Músculo",
    "Glade", "Elite", "Higienol", "Sussex", "Elegante", "Campanita", "Felpita",
    "Colgate", "Kolynos", "Oral-B", "Sensodyne", "Dove", "Rexona", "Axe", "Nivea",
    "Plusbelle", "Sedal", "Pantene", "Head & Shoulders", "Suave", "Algodón Estrella",
    "Curitas", "Bayaspirina", "Actron", "Tafirol", "Ibupirac", "Alikal", "Buscapina",
    "Dorflex", "Vick Pyrena"
]

def extract_brand_from_name(name: str) -> str:
    """Intelligently detects known brand name in product description."""
    lower_name = name.lower()
    for brand in KNOWN_BRANDS:
        if brand.lower() in lower_name:
            return brand
    # Fallback to first word
    parts = name.split()
    return parts[0] if parts else "Genérico"

class Command(BaseCommand):
    help = "Ingest thousands of Argentine retail products into MasterCatalogProduct"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            type=str,
            help="Path to local CSV or JSON file containing products (e.g. SEPA open data).",
        )
        parser.add_argument(
            "--url",
            type=str,
            help="URL to fetch CSV or JSON master catalog data.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing MasterCatalogProduct entries before ingesting.",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting Master Argentine Retail Catalog Ingestion..."))

        if options["clear"]:
            count = MasterCatalogProduct.objects.count()
            MasterCatalogProduct.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {count} existing master products."))

        created_count = 0
        updated_count = 0

        # Step 1: Ingest all presets from starter_catalog.py
        self.stdout.write("Ingesting rubro presets & retail starter catalog...")
        for rubro_key, rubro_data in RUBRO_PRESETS.items():
            for cat_group in rubro_data.get("catalog", []):
                category_name = cat_group.get("category", "General")
                for item in cat_group.get("products", []):
                    barcode = str(item.get("barcode", "")).strip()
                    if not barcode:
                        continue
                    name = item.get("name", "").strip()
                    if not name:
                        continue

                    brand = item.get("brand") or extract_brand_from_name(name)
                    unit_type = item.get("unit_type", Product.UnitType.UNIT)
                    sale_price = item.get("sale_price")
                    cost_price = item.get("cost_price")

                    obj, created = MasterCatalogProduct.objects.update_or_create(
                        barcode=barcode,
                        defaults={
                            "name": name,
                            "brand": brand,
                            "category_name": category_name,
                            "unit_type": unit_type,
                            "suggested_sale_price": sale_price,
                            "suggested_cost_price": cost_price,
                            "source": "preset",
                        }
                    )
        # Step 2: Ingest from frontend/src/utils/nationalCatalog.js if present
        from django.conf import settings
        frontend_catalog_path = os.path.join(settings.BASE_DIR.parent, "frontend", "src", "utils", "nationalCatalog.js")
        if os.path.exists(frontend_catalog_path):
            self.stdout.write(f"Ingesting national catalog from {frontend_catalog_path}...")
            try:
                with open(frontend_catalog_path, mode="r", encoding="utf-8") as f:
                    content = f.read()
                # Match objects: { barcode: "...", name: "...", category: "...", sale_price: 123, cost_price: 456, unit_type: "..." }
                pattern = re.compile(r'\{\s*barcode:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*category:\s*"([^"]+)",\s*sale_price:\s*([0-9.]+),\s*cost_price:\s*([0-9.]+),\s*unit_type:\s*"([^"]+)"\s*\}')
                matches = pattern.findall(content)
                for barcode, name, category, sale_p, cost_p, unit_t in matches:
                    barcode = barcode.strip()
                    name = name.strip()
                    if not barcode or not name:
                        continue
                    brand = extract_brand_from_name(name)
                    obj, created = MasterCatalogProduct.objects.update_or_create(
                        barcode=barcode,
                        defaults={
                            "name": name,
                            "brand": brand,
                            "category_name": category.strip(),
                            "unit_type": unit_t.strip(),
                            "suggested_sale_price": Decimal(sale_p),
                            "suggested_cost_price": Decimal(cost_p),
                            "source": "national_catalog_js",
                        }
                    )
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not parse nationalCatalog.js: {e}"))

        # Step 3: Ingest from file or URL if specified
        file_path = options.get("file")
        url = options.get("url")

        if url:
            self.stdout.write(f"Downloading master catalog from {url}...")
            try:
                temp_file = "temp_master_catalog.csv"
                urllib.request.urlretrieve(url, temp_file)
                file_path = temp_file
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to download catalog: {e}"))

        if file_path and os.path.exists(file_path):
            self.stdout.write(f"Ingesting external dataset from {file_path}...")
            if file_path.endswith(".csv"):
                file_created, file_updated = self._ingest_csv(file_path)
            elif file_path.endswith(".json"):
                file_created, file_updated = self._ingest_json(file_path)
            else:
                self.stdout.write(self.style.ERROR(f"Unsupported file extension: {file_path}"))
                file_created, file_updated = 0, 0
            created_count += file_created
            updated_count += file_updated

        total_master = MasterCatalogProduct.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Ingestion complete! Created: {created_count}, Updated: {updated_count}. Total Master Catalog Products: {total_master}"
            )
        )

    def _ingest_csv(self, file_path: str):
        created_count = 0
        updated_count = 0
        with open(file_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            batch = []
            for row in reader:
                # SEPA / Precios Claros column mapping or standard CSV columns
                barcode = str(row.get("id_producto") or row.get("ean") or row.get("codigo_barra") or row.get("barcode") or "").strip()
                name = str(row.get("nombre") or row.get("descripcion") or row.get("name") or "").strip()
                if not barcode or not name:
                    continue

                brand = str(row.get("marca") or row.get("brand") or "").strip() or extract_brand_from_name(name)
                category = str(row.get("categoria") or row.get("rubro") or row.get("category") or "Almacén & Despensa").strip()
                
                # Pricing
                price_val = row.get("precio") or row.get("precio_unitario") or row.get("sale_price")
                sale_price = None
                if price_val:
                    try:
                        sale_price = Decimal(str(price_val).replace("$", "").replace(",", ".").strip())
                    except Exception:
                        sale_price = None

                cost_price = (sale_price * Decimal("0.70")).quantize(Decimal("1.00")) if sale_price else None

                unit_type = Product.UnitType.UNIT
                if any(k in name.lower() for k in [" kg", "kilo", "granel", " x kg"]):
                    unit_type = Product.UnitType.KG
                elif any(k in name.lower() for k in [" lts", "litro", " x l"]):
                    unit_type = Product.UnitType.LITER

                obj, created = MasterCatalogProduct.objects.update_or_create(
                    barcode=barcode,
                    defaults={
                        "name": name,
                        "brand": brand,
                        "category_name": category,
                        "unit_type": unit_type,
                        "suggested_sale_price": sale_price,
                        "suggested_cost_price": cost_price,
                        "source": "sepa_import",
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        return created_count, updated_count

    def _ingest_json(self, file_path: str):
        created_count = 0
        updated_count = 0
        with open(file_path, mode="r", encoding="utf-8") as f:
            data = json.load(f)
            items = data if isinstance(data, list) else data.get("products", [])
            for item in items:
                barcode = str(item.get("barcode") or item.get("ean") or "").strip()
                name = str(item.get("name") or item.get("nombre") or "").strip()
                if not barcode or not name:
                    continue

                brand = str(item.get("brand") or item.get("marca") or "").strip() or extract_brand_from_name(name)
                category = str(item.get("category") or item.get("category_name") or "General").strip()
                
                sale_price = None
                cost_price = None
                if item.get("sale_price") or item.get("precio"):
                    try:
                        sale_price = Decimal(str(item.get("sale_price") or item.get("precio")))
                    except Exception:
                        pass
                if item.get("cost_price"):
                    try:
                        cost_price = Decimal(str(item.get("cost_price")))
                    except Exception:
                        pass

                unit_type = item.get("unit_type", Product.UnitType.UNIT)

                obj, created = MasterCatalogProduct.objects.update_or_create(
                    barcode=barcode,
                    defaults={
                        "name": name,
                        "brand": brand,
                        "category_name": category,
                        "unit_type": unit_type,
                        "suggested_sale_price": sale_price,
                        "suggested_cost_price": cost_price,
                        "source": item.get("source", "json_import"),
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        return created_count, updated_count
