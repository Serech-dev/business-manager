from decimal import Decimal
from django.db import transaction as db_transaction
from .models import Category, Product

GROCERY_STARTER_CATALOG = [
    {
        "category": "Bebidas & Gaseosas",
        "products": [
            {"name": "Coca Cola 500ml", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00")},
            {"name": "Coca Cola 1.5L", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00")},
            {"name": "Coca Cola 2.25L", "sale_price": Decimal("3600.00"), "cost_price": Decimal("2700.00")},
            {"name": "Coca Cola Sin Azúcar 1.5L", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00")},
            {"name": "Sprite 1.5L", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00")},
            {"name": "Fanta Naranja 1.5L", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00")},
            {"name": "Manaos Cola 2.25L", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00")},
            {"name": "Agua Villavicencio 500ml sin gas", "sale_price": Decimal("1200.00"), "cost_price": Decimal("850.00")},
            {"name": "Agua Villavicencio 1.5L sin gas", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1250.00")},
            {"name": "Levité Pomelo 1.5L", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1500.00")},
            {"name": "Levité Naranja 1.5L", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1500.00")},
            {"name": "Speed Unlimited 250ml", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1150.00")},
            {"name": "Monster Energy 473ml", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2050.00")},
            {"name": "Gatorade Manzana 500ml", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1600.00")},
            {"name": "Jugo Baggio Pronto Naranja 1L", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1400.00")},
        ],
    },
    {
        "category": "Cervezas & Alcohol",
        "products": [
            {"name": "Cerveza Quilmes Clásica 1L", "sale_price": Decimal("3200.00"), "cost_price": Decimal("2350.00")},
            {"name": "Cerveza Brahma Lata 473ml", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1550.00")},
            {"name": "Cerveza Stella Artois Lata 473ml", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1900.00")},
            {"name": "Cerveza Corona 330ml", "sale_price": Decimal("2700.00"), "cost_price": Decimal("2000.00")},
            {"name": "Cerveza Heineken 1L", "sale_price": Decimal("4200.00"), "cost_price": Decimal("3100.00")},
            {"name": "Fernet Branca 750ml", "sale_price": Decimal("13500.00"), "cost_price": Decimal("10200.00")},
            {"name": "Gancia Americano 950ml", "sale_price": Decimal("6200.00"), "cost_price": Decimal("4600.00")},
            {"name": "Vino Toro Tinto Clásico 1L", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1750.00")},
            {"name": "Vino Norton Clásico Tinto 750ml", "sale_price": Decimal("4900.00"), "cost_price": Decimal("3600.00")},
            {"name": "Campari 750ml", "sale_price": Decimal("9800.00"), "cost_price": Decimal("7400.00")},
        ],
    },
    {
        "category": "Golosinas & Chocolates",
        "products": [
            {"name": "Alfajor Guaymallén Chocolate", "sale_price": Decimal("500.00"), "cost_price": Decimal("350.00")},
            {"name": "Alfajor Guaymallén Blanco", "sale_price": Decimal("500.00"), "cost_price": Decimal("350.00")},
            {"name": "Alfajor Jorgito Chocolate", "sale_price": Decimal("900.00"), "cost_price": Decimal("650.00")},
            {"name": "Alfajor Milka Mousse", "sale_price": Decimal("1500.00"), "cost_price": Decimal("1100.00")},
            {"name": "Alfajor Capitán del Espacio Triple", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1000.00")},
            {"name": "Alfajor Águila Mini Torta Clásica", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1150.00")},
            {"name": "Chocolate Cofler Block 38g", "sale_price": Decimal("1100.00"), "cost_price": Decimal("800.00")},
            {"name": "Rocklets Confites 40g", "sale_price": Decimal("950.00"), "cost_price": Decimal("700.00")},
            {"name": "Gomitas Mogul Ositos 30g", "sale_price": Decimal("700.00"), "cost_price": Decimal("500.00")},
            {"name": "Gomitas Surtidas sueltas", "sale_price": Decimal("950.00"), "cost_price": Decimal("650.00"), "unit_type": "100g"},
            {"name": "Chicles Beldent Menta 10u", "sale_price": Decimal("850.00"), "cost_price": Decimal("600.00")},
            {"name": "Turrón Arcor 25g", "sale_price": Decimal("400.00"), "cost_price": Decimal("280.00")},
            {"name": "Caramelos Sugus Confitados 50g", "sale_price": Decimal("800.00"), "cost_price": Decimal("580.00")},
            {"name": "Chupetín Pico Dulce", "sale_price": Decimal("350.00"), "cost_price": Decimal("240.00")},
        ],
    },
    {
        "category": "Galletitas & Snacks",
        "products": [
            {"name": "Galletitas Oreo Original 118g", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00")},
            {"name": "Galletitas Rumba 112g", "sale_price": Decimal("1300.00"), "cost_price": Decimal("950.00")},
            {"name": "Galletitas Chocolinas 170g", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00")},
            {"name": "Galletitas Criollitas Pack x3 300g", "sale_price": Decimal("1700.00"), "cost_price": Decimal("1250.00")},
            {"name": "Galletitas Traviata Pack x3 300g", "sale_price": Decimal("1700.00"), "cost_price": Decimal("1250.00")},
            {"name": "Pepas Terepín Membrillo 300g", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1150.00")},
            {"name": "Bizcochos Don Satur Salados 200g", "sale_price": Decimal("1100.00"), "cost_price": Decimal("800.00")},
            {"name": "Bizcochos Don Satur Dulces 200g", "sale_price": Decimal("1100.00"), "cost_price": Decimal("800.00")},
            {"name": "Papas Lays Clásicas 85g", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1900.00")},
            {"name": "Doritos Queso 85g", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2050.00")},
            {"name": "Maní Tostado Salado Pehuamar 100g", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1000.00")},
            {"name": "Chizitos Saladix 80g", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1150.00")},
        ],
    },
    {
        "category": "Almacén & Despensa",
        "products": [
            {"name": "Yerba Mate Playadito 500g", "sale_price": Decimal("2900.00"), "cost_price": Decimal("2150.00")},
            {"name": "Yerba Mate Taragüi 500g", "sale_price": Decimal("2700.00"), "cost_price": Decimal("2000.00")},
            {"name": "Azúcar Ledesma Clásica 1kg", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1050.00")},
            {"name": "Aceite de Girasol Natura 900ml", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1780.00")},
            {"name": "Arroz Lucchetti Largo Fino 1kg", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1550.00")},
            {"name": "Fideos Lucchetti Tallarín 500g", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00")},
            {"name": "Fideos Lucchetti Tirabuzón 500g", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00")},
            {"name": "Harina de Trigo Pureza 0000 1kg", "sale_price": Decimal("1300.00"), "cost_price": Decimal("950.00")},
            {"name": "Puré de Tomate La Campagnola 520g", "sale_price": Decimal("1100.00"), "cost_price": Decimal("800.00")},
            {"name": "Atún Desmenuzado al Natural La Campagnola 170g", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00")},
            {"name": "Mayonesa Natura Doypack 500g", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1620.00")},
            {"name": "Sal Fina Dos Anclas 500g", "sale_price": Decimal("1200.00"), "cost_price": Decimal("880.00")},
            {"name": "Café Dolca Torrado Suave 170g", "sale_price": Decimal("5200.00"), "cost_price": Decimal("3900.00")},
            {"name": "Té La Virginia Clásico 25 saquitos", "sale_price": Decimal("1300.00"), "cost_price": Decimal("950.00")},
            {"name": "Mate Cocido Taragüi 25 saquitos", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1050.00")},
        ],
    },
    {
        "category": "Lácteos & Fiambrería",
        "products": [
            {"name": "Leche La Serenísima Clásica 1L Sachet", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1200.00")},
            {"name": "Leche La Serenísima Larga Vida 1L", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1450.00")},
            {"name": "Manteca La Serenísima 200g", "sale_price": Decimal("2900.00"), "cost_price": Decimal("2200.00")},
            {"name": "Dulce de Leche La Serenísima Colonial 400g", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00")},
            {"name": "Queso Cremoso La Paulina", "sale_price": Decimal("950.00"), "cost_price": Decimal("700.00"), "unit_type": "100g"},
            {"name": "Jamón Cocido Paladini", "sale_price": Decimal("1200.00"), "cost_price": Decimal("880.00"), "unit_type": "100g"},
            {"name": "Milanesas de Pollo / Carne", "sale_price": Decimal("8500.00"), "cost_price": Decimal("6200.00"), "unit_type": "kg"},
            {"name": "Pan Francés", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1700.00"), "unit_type": "kg"},
            {"name": "Pan Criollo / Mignon", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1800.00"), "unit_type": "kg"},
            {"name": "Queso Untable Casancrem Clásico 290g", "sale_price": Decimal("3200.00"), "cost_price": Decimal("2400.00")},
            {"name": "Yogur Firme Ilolay Vainilla 120g", "sale_price": Decimal("900.00"), "cost_price": Decimal("650.00")},
            {"name": "Tapa para Empanadas La Salteña 12u", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00")},
        ],
    },
    {
        "category": "Cigarrillos & Tabaco",
        "products": [
            {"name": "Cigarrillos Marlboro Box 20", "sale_price": Decimal("4200.00"), "cost_price": Decimal("3850.00")},
            {"name": "Cigarrillos Marlboro Crafted 20", "sale_price": Decimal("3500.00"), "cost_price": Decimal("3200.00")},
            {"name": "Cigarrillos Red Point Box 20", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1900.00")},
            {"name": "Cigarrillos Philip Morris Box 20", "sale_price": Decimal("3800.00"), "cost_price": Decimal("3500.00")},
            {"name": "Cigarrillos Chesterfield Original 20", "sale_price": Decimal("3300.00"), "cost_price": Decimal("3000.00")},
            {"name": "Cigarrillos Lucky Strike Box 20", "sale_price": Decimal("3700.00"), "cost_price": Decimal("3400.00")},
            {"name": "Encendedor Bic Chico", "sale_price": Decimal("1500.00"), "cost_price": Decimal("1050.00")},
            {"name": "Fósforos Tres Patitos", "sale_price": Decimal("500.00"), "cost_price": Decimal("350.00")},
        ],
    },
    {
        "category": "Limpieza & Perfumería",
        "products": [
            {"name": "Lavandina Ayudín Clásica 1L", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00")},
            {"name": "Detergente Magistral Limón 500ml", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00")},
            {"name": "Limpiador Líquido Poett Primavera 900ml", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1400.00")},
            {"name": "Jabón Líquido para Ropa Skip 1L", "sale_price": Decimal("4900.00"), "cost_price": Decimal("3700.00")},
            {"name": "Papel Higiénico Higienol Max 4u", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00")},
            {"name": "Rollo de Cocina Sussex Clásico 3u", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1800.00")},
            {"name": "Desodorante Rexona Aerosol Hombre 150ml", "sale_price": Decimal("3600.00"), "cost_price": Decimal("2700.00")},
            {"name": "Shampoo Sedal Ceramidas 350ml", "sale_price": Decimal("3200.00"), "cost_price": Decimal("2400.00")},
            {"name": "Jabón de Tocador Dove Original 90g", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1020.00")},
            {"name": "Crema Dental Colgate Total 12 90g", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00")},
        ],
    },
]


def import_starter_catalog_for_user(user):
    """
    Imports the starter grocery catalog for the given user.
    Creates categories and products that don't already exist.
    """
    created_categories_count = 0
    created_products_count = 0

    with db_transaction.atomic():
        for group in GROCERY_STARTER_CATALOG:
            cat_name = group["category"]
            category, cat_created = Category.objects.get_or_create(
                user=user,
                name=cat_name,
            )
            if cat_created:
                created_categories_count += 1

            for item in group["products"]:
                product_name = item["name"]
                unit_type = item.get("unit_type", Product.UnitType.UNIT)
                # Avoid duplicate if product name already exists for user
                product, prod_created = Product.objects.get_or_create(
                    user=user,
                    name=product_name,
                    defaults={
                        "category": category,
                        "unit_type": unit_type,
                        "sale_price": item["sale_price"],
                        "cost_price": item["cost_price"],
                        "is_active": True,
                    },
                )
                if prod_created:
                    created_products_count += 1

    return {
        "created_categories": created_categories_count,
        "created_products": created_products_count,
    }

