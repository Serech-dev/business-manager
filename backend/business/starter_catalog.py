from decimal import Decimal
from django.db import transaction as db_transaction
from .models import Category, Product

RUBRO_PRESETS = {
    "kiosco_bebidas": {
        "id": "kiosco_bebidas",
        "name": "Kiosco, Bebidas & Golosinas",
        "description": "Gaseosas, cervezas, alfajores, chocolates, snacks y cigarrillos.",
        "icon": "sparkles",
        "catalog": [
            {
                "category": "Bebidas & Gaseosas",
                "products": [
                    {"name": "Coca Cola 500ml", "barcode": "7790895000997", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00"), "unit_type": "unit"},
                    {"name": "Coca Cola 1.5L", "barcode": "7790895000447", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00"), "unit_type": "unit"},
                    {"name": "Coca Cola 2.25L", "barcode": "7790895000973", "sale_price": Decimal("3600.00"), "cost_price": Decimal("2700.00"), "unit_type": "unit"},
                    {"name": "Coca Cola Sin Azúcar 1.5L", "barcode": "7790895067211", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00"), "unit_type": "unit"},
                    {"name": "Sprite 1.5L", "barcode": "7790895001451", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00"), "unit_type": "unit"},
                    {"name": "Fanta Naranja 1.5L", "barcode": "7790895002441", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00"), "unit_type": "unit"},
                    {"name": "Manaos Cola 2.25L", "barcode": "7798131200017", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00"), "unit_type": "unit"},
                    {"name": "Agua Villavicencio 500ml sin gas", "barcode": "7790314055276", "sale_price": Decimal("1200.00"), "cost_price": Decimal("850.00"), "unit_type": "unit"},
                    {"name": "Agua Villavicencio 1.5L sin gas", "barcode": "7790314055283", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1250.00"), "unit_type": "unit"},
                    {"name": "Levité Pomelo 1.5L", "barcode": "7790314058864", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1500.00"), "unit_type": "unit"},
                    {"name": "Levité Naranja 1.5L", "barcode": "7790314058871", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1500.00"), "unit_type": "unit"},
                    {"name": "Speed Unlimited 250ml", "barcode": "7798085440019", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1150.00"), "unit_type": "unit"},
                    {"name": "Monster Energy 473ml", "barcode": "70847012476", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2050.00"), "unit_type": "unit"},
                    {"name": "Gatorade Manzana 500ml", "barcode": "7791813421117", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1600.00"), "unit_type": "unit"},
                    {"name": "Jugo Baggio Pronto Naranja 1L", "barcode": "7790580120159", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1400.00"), "unit_type": "unit"},
                ],
            },
            {
                "category": "Cervezas & Alcohol",
                "products": [
                    {"name": "Cerveza Quilmes Clásica 1L", "barcode": "7792798000012", "sale_price": Decimal("3200.00"), "cost_price": Decimal("2350.00"), "unit_type": "unit"},
                    {"name": "Cerveza Brahma Lata 473ml", "barcode": "7792798000418", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1550.00"), "unit_type": "unit"},
                    {"name": "Cerveza Stella Artois Lata 473ml", "barcode": "7792798007554", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1900.00"), "unit_type": "unit"},
                    {"name": "Cerveza Corona 330ml", "barcode": "7501064191404", "sale_price": Decimal("2700.00"), "cost_price": Decimal("2000.00"), "unit_type": "unit"},
                    {"name": "Cerveza Heineken 1L", "barcode": "7790895007415", "sale_price": Decimal("4200.00"), "cost_price": Decimal("3100.00"), "unit_type": "unit"},
                    {"name": "Fernet Branca 750ml", "barcode": "7790440000010", "sale_price": Decimal("13500.00"), "cost_price": Decimal("10200.00"), "unit_type": "unit"},
                    {"name": "Gancia Americano 950ml", "barcode": "7790440000058", "sale_price": Decimal("6200.00"), "cost_price": Decimal("4600.00"), "unit_type": "unit"},
                    {"name": "Vino Toro Tinto Clásico 1L", "barcode": "7790704000019", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1750.00"), "unit_type": "unit"},
                    {"name": "Vino Norton Clásico Tinto 750ml", "barcode": "7790704000217", "sale_price": Decimal("4900.00"), "cost_price": Decimal("3600.00"), "unit_type": "unit"},
                    {"name": "Campari 750ml", "barcode": "7790440000300", "sale_price": Decimal("9800.00"), "cost_price": Decimal("7400.00"), "unit_type": "unit"},
                ],
            },
            {
                "category": "Golosinas & Chocolates",
                "products": [
                    {"name": "Alfajor Guaymallén Chocolate", "barcode": "7790580980012", "sale_price": Decimal("500.00"), "cost_price": Decimal("350.00"), "unit_type": "unit"},
                    {"name": "Alfajor Guaymallén Blanco", "barcode": "7790580980029", "sale_price": Decimal("500.00"), "cost_price": Decimal("350.00"), "unit_type": "unit"},
                    {"name": "Alfajor Jorgito Chocolate", "barcode": "7790580130011", "sale_price": Decimal("900.00"), "cost_price": Decimal("650.00"), "unit_type": "unit"},
                    {"name": "Alfajor Milka Mousse", "barcode": "7622210603875", "sale_price": Decimal("1500.00"), "cost_price": Decimal("1100.00"), "unit_type": "unit"},
                    {"name": "Alfajor Capitán del Espacio Triple", "barcode": "7798001234567", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1000.00"), "unit_type": "unit"},
                    {"name": "Alfajor Águila Mini Torta Clásica", "barcode": "7790580132015", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1150.00"), "unit_type": "unit"},
                    {"name": "Chocolate Cofler Block 38g", "barcode": "7790580112345", "sale_price": Decimal("1100.00"), "cost_price": Decimal("800.00"), "unit_type": "unit"},
                    {"name": "Rocklets Confites 40g", "barcode": "7790580121118", "sale_price": Decimal("950.00"), "cost_price": Decimal("700.00"), "unit_type": "unit"},
                    {"name": "Gomitas Mogul Ositos 30g", "barcode": "7790580115568", "sale_price": Decimal("700.00"), "cost_price": Decimal("500.00"), "unit_type": "unit"},
                    {"name": "Gomitas Surtidas sueltas", "barcode": "", "sale_price": Decimal("950.00"), "cost_price": Decimal("650.00"), "unit_type": "100g"},
                    {"name": "Chicles Beldent Menta 10u", "barcode": "7790580123456", "sale_price": Decimal("850.00"), "cost_price": Decimal("600.00"), "unit_type": "unit"},
                    {"name": "Turrón Arcor 25g", "barcode": "7790580110013", "sale_price": Decimal("400.00"), "cost_price": Decimal("280.00"), "unit_type": "unit"},
                    {"name": "Caramelos Sugus Confitados 50g", "barcode": "7790580117789", "sale_price": Decimal("800.00"), "cost_price": Decimal("580.00"), "unit_type": "unit"},
                    {"name": "Chupetín Pico Dulce", "barcode": "7790580118890", "sale_price": Decimal("350.00"), "cost_price": Decimal("240.00"), "unit_type": "unit"},
                ],
            },
            {
                "category": "Galletitas & Snacks",
                "products": [
                    {"name": "Galletitas Oreo Original 118g", "barcode": "7622300744648", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00"), "unit_type": "unit"},
                    {"name": "Galletitas Rumba 112g", "barcode": "7790580114455", "sale_price": Decimal("1300.00"), "cost_price": Decimal("950.00"), "unit_type": "unit"},
                    {"name": "Galletitas Chocolinas 170g", "barcode": "7790580113322", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00"), "unit_type": "unit"},
                    {"name": "Galletitas Criollitas Pack x3 300g", "barcode": "7790580116677", "sale_price": Decimal("1700.00"), "cost_price": Decimal("1250.00"), "unit_type": "unit"},
                    {"name": "Galletitas Traviata Pack x3 300g", "barcode": "7790580117799", "sale_price": Decimal("1700.00"), "cost_price": Decimal("1250.00"), "unit_type": "unit"},
                    {"name": "Pepas Terepín Membrillo 300g", "barcode": "7790580118811", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1150.00"), "unit_type": "unit"},
                    {"name": "Bizcochos Don Satur Salados 200g", "barcode": "7790580119922", "sale_price": Decimal("1100.00"), "cost_price": Decimal("800.00"), "unit_type": "unit"},
                    {"name": "Bizcochos Don Satur Dulces 200g", "barcode": "7790580119939", "sale_price": Decimal("1100.00"), "cost_price": Decimal("800.00"), "unit_type": "unit"},
                    {"name": "Papas Lays Clásicas 85g", "barcode": "7791813423180", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1900.00"), "unit_type": "unit"},
                    {"name": "Doritos Queso 85g", "barcode": "7791813424217", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2050.00"), "unit_type": "unit"},
                    {"name": "Maní Tostado Salado Pehuamar 100g", "barcode": "7791813425320", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1000.00"), "unit_type": "unit"},
                    {"name": "Chizitos Saladix 80g", "barcode": "7790580122233", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1150.00"), "unit_type": "unit"},
                ],
            },
            {
                "category": "Cigarrillos & Tabaco",
                "products": [
                    {"name": "Cigarrillos Marlboro Box 20", "barcode": "7791234560011", "sale_price": Decimal("4200.00"), "cost_price": Decimal("3850.00"), "unit_type": "unit"},
                    {"name": "Cigarrillos Marlboro Crafted 20", "barcode": "7791234560028", "sale_price": Decimal("3500.00"), "cost_price": Decimal("3200.00"), "unit_type": "unit"},
                    {"name": "Cigarrillos Red Point Box 20", "barcode": "7791234560035", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1900.00"), "unit_type": "unit"},
                    {"name": "Cigarrillos Philip Morris Box 20", "barcode": "7791234560042", "sale_price": Decimal("3800.00"), "cost_price": Decimal("3500.00"), "unit_type": "unit"},
                    {"name": "Cigarrillos Chesterfield Original 20", "barcode": "7791234560059", "sale_price": Decimal("3300.00"), "cost_price": Decimal("3000.00"), "unit_type": "unit"},
                    {"name": "Cigarrillos Lucky Strike Box 20", "barcode": "7791234560066", "sale_price": Decimal("3700.00"), "cost_price": Decimal("3400.00"), "unit_type": "unit"},
                    {"name": "Encendedor Bic Chico", "barcode": "3086126600018", "sale_price": Decimal("1500.00"), "cost_price": Decimal("1050.00"), "unit_type": "unit"},
                    {"name": "Fósforos Tres Patitos", "barcode": "7790580110123", "sale_price": Decimal("500.00"), "cost_price": Decimal("350.00"), "unit_type": "unit"},
                ],
            },
        ],
    },
    "almacen_despensa": {
        "id": "almacen_despensa",
        "name": "Almacén & Despensa",
        "description": "Pan, yerbas, aceites, harinas, fideos, arroz, condimentos, café y conservas.",
        "icon": "shopping-bag",
        "catalog": [
            {
                "category": "Almacén & Despensa",
                "products": [
                    {"name": "Pan (por kilo)", "barcode": "", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1700.00"), "unit_type": "kg"},
                    {"name": "Yerba Mate Playadito 500g", "barcode": "7791290000105", "sale_price": Decimal("2900.00"), "cost_price": Decimal("2150.00"), "unit_type": "unit"},
                    {"name": "Yerba Mate Taragüi 500g", "barcode": "7790387011407", "sale_price": Decimal("2700.00"), "cost_price": Decimal("2000.00"), "unit_type": "unit"},
                    {"name": "Yerba Mate Amanda 500g", "barcode": "7790070011234", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1900.00"), "unit_type": "unit"},
                    {"name": "Azúcar Ledesma Clásica 1kg", "barcode": "7790170011234", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1050.00"), "unit_type": "unit"},
                    {"name": "Aceite de Girasol Natura 900ml", "barcode": "7790272001005", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1780.00"), "unit_type": "unit"},
                    {"name": "Aceite Cocinero Girasol 900ml", "barcode": "7790272001111", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1650.00"), "unit_type": "unit"},
                    {"name": "Arroz Lucchetti Largo Fino 1kg", "barcode": "7790070411234", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1550.00"), "unit_type": "unit"},
                    {"name": "Arroz Gallo Oro Parboil 1kg", "barcode": "7790070511234", "sale_price": Decimal("2700.00"), "cost_price": Decimal("2000.00"), "unit_type": "unit"},
                    {"name": "Fideos Lucchetti Tallarín 500g", "barcode": "7790070421234", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00"), "unit_type": "unit"},
                    {"name": "Fideos Lucchetti Tirabuzón 500g", "barcode": "7790070431234", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00"), "unit_type": "unit"},
                    {"name": "Fideos Matarazzo Mostachol 500g", "barcode": "7790070441234", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1400.00"), "unit_type": "unit"},
                    {"name": "Harina de Trigo Pureza 0000 1kg", "barcode": "7790070451234", "sale_price": Decimal("1300.00"), "cost_price": Decimal("950.00"), "unit_type": "unit"},
                    {"name": "Harina Favorita Leudante 1kg", "barcode": "7790070461234", "sale_price": Decimal("1500.00"), "cost_price": Decimal("1100.00"), "unit_type": "unit"},
                    {"name": "Puré de Tomate La Campagnola 520g", "barcode": "7790580125555", "sale_price": Decimal("1100.00"), "cost_price": Decimal("800.00"), "unit_type": "unit"},
                    {"name": "Puré de Tomate Arcor Tetra 520g", "barcode": "7790580126666", "sale_price": Decimal("1050.00"), "cost_price": Decimal("750.00"), "unit_type": "unit"},
                    {"name": "Atún Desmenuzado al Natural La Campagnola 170g", "barcode": "7790580127777", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00"), "unit_type": "unit"},
                    {"name": "Mayonesa Natura Doypack 500g", "barcode": "7790272001222", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1620.00"), "unit_type": "unit"},
                    {"name": "Mayonesa Hellmann's Doypack 475g", "barcode": "7790272001333", "sale_price": Decimal("2500.00"), "cost_price": Decimal("1850.00"), "unit_type": "unit"},
                    {"name": "Sal Fina Dos Anclas 500g", "barcode": "7790150001234", "sale_price": Decimal("1200.00"), "cost_price": Decimal("880.00"), "unit_type": "unit"},
                    {"name": "Café Dolca Torrado Suave 170g", "barcode": "7613035341234", "sale_price": Decimal("5200.00"), "cost_price": Decimal("3900.00"), "unit_type": "unit"},
                    {"name": "Té La Virginia Clásico 25 saquitos", "barcode": "7790060001234", "sale_price": Decimal("1300.00"), "cost_price": Decimal("950.00"), "unit_type": "unit"},
                    {"name": "Mate Cocido Taragüi 25 saquitos", "barcode": "7790387011506", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1050.00"), "unit_type": "unit"},
                    {"name": "Cacao en Polvo Chocolino 360g", "barcode": "7790580128888", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1900.00"), "unit_type": "unit"},
                    {"name": "Vinagre de Alcohol Menoyo 500ml", "barcode": "7790180001234", "sale_price": Decimal("1200.00"), "cost_price": Decimal("850.00"), "unit_type": "unit"},
                    {"name": "Lentejas Noel Tetra 400g", "barcode": "7790580129999", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1000.00"), "unit_type": "unit"},
                    {"name": "Choclo Amarillo en Grano La Campagnola 300g", "barcode": "7790580131111", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1400.00"), "unit_type": "unit"},
                ],
            },
        ],
    },
    "fiambreria_lacteos": {
        "id": "fiambreria_lacteos",
        "name": "Fiambrería & Lácteos",
        "description": "Quesos y fiambres por peso (100g y kg), leches, manteca, yogures y tapas.",
        "icon": "cake",
        "catalog": [
            {
                "category": "Lácteos & Fiambrería",
                "products": [
                    {"name": "Queso Cremoso La Paulina", "barcode": "", "sale_price": Decimal("950.00"), "cost_price": Decimal("700.00"), "unit_type": "100g"},
                    {"name": "Queso Barra Tybo Paladini", "barcode": "", "sale_price": Decimal("1100.00"), "cost_price": Decimal("820.00"), "unit_type": "100g"},
                    {"name": "Queso Sardo Estacionado", "barcode": "", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1050.00"), "unit_type": "100g"},
                    {"name": "Queso Muzzarella en Barra", "barcode": "", "sale_price": Decimal("980.00"), "cost_price": Decimal("720.00"), "unit_type": "100g"},
                    {"name": "Queso Azul / Roquefort", "barcode": "", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1200.00"), "unit_type": "100g"},
                    {"name": "Queso Rallado La Serenísima 40g", "barcode": "7790080011234", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1050.00"), "unit_type": "unit"},
                    {"name": "Jamón Cocido Paladini", "barcode": "", "sale_price": Decimal("1200.00"), "cost_price": Decimal("880.00"), "unit_type": "100g"},
                    {"name": "Jamón Crudo Serrano Feteado", "barcode": "", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1350.00"), "unit_type": "100g"},
                    {"name": "Paleta Sanguchera Especial", "barcode": "", "sale_price": Decimal("750.00"), "cost_price": Decimal("520.00"), "unit_type": "100g"},
                    {"name": "Salame Milán Fetas", "barcode": "", "sale_price": Decimal("1300.00"), "cost_price": Decimal("950.00"), "unit_type": "100g"},
                    {"name": "Salame de Colonia / Bastón", "barcode": "", "sale_price": Decimal("3800.00"), "cost_price": Decimal("2800.00"), "unit_type": "unit"},
                    {"name": "Mortadela Paladini", "barcode": "", "sale_price": Decimal("850.00"), "cost_price": Decimal("600.00"), "unit_type": "100g"},
                    {"name": "Salchichas Vienissima 6u", "barcode": "7790080041234", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00"), "unit_type": "unit"},
                    {"name": "Aceitunas Verdes sueltas", "barcode": "", "sale_price": Decimal("850.00"), "cost_price": Decimal("600.00"), "unit_type": "100g"},
                    {"name": "Aceitunas Negras sueltas", "barcode": "", "sale_price": Decimal("950.00"), "cost_price": Decimal("680.00"), "unit_type": "100g"},
                    {"name": "Pickles Mixtos en vinagre", "barcode": "", "sale_price": Decimal("800.00"), "cost_price": Decimal("550.00"), "unit_type": "100g"},
                    {"name": "Leche La Serenísima Clásica 1L Sachet", "barcode": "7790080051234", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1200.00"), "unit_type": "unit"},
                    {"name": "Leche La Serenísima Larga Vida 1L", "barcode": "7790080061234", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1450.00"), "unit_type": "unit"},
                    {"name": "Manteca La Serenísima 200g", "barcode": "7790080071234", "sale_price": Decimal("2900.00"), "cost_price": Decimal("2200.00"), "unit_type": "unit"},
                    {"name": "Dulce de Leche La Serenísima Colonial 400g", "barcode": "7790080081234", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00"), "unit_type": "unit"},
                    {"name": "Queso Untable Casancrem Clásico 290g", "barcode": "7790080021234", "sale_price": Decimal("3200.00"), "cost_price": Decimal("2400.00"), "unit_type": "unit"},
                    {"name": "Yogur Firme Ilolay Vainilla 120g", "barcode": "7790080091234", "sale_price": Decimal("900.00"), "cost_price": Decimal("650.00"), "unit_type": "unit"},
                    {"name": "Crema de Leche La Serenísima 200g", "barcode": "7790080101234", "sale_price": Decimal("2300.00"), "cost_price": Decimal("1700.00"), "unit_type": "unit"},
                    {"name": "Tapa para Empanadas La Salteña 12u", "barcode": "7790080111234", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00"), "unit_type": "unit"},
                    {"name": "Tapa Pascualina Hojaldre La Salteña 2u", "barcode": "7790080121234", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1550.00"), "unit_type": "unit"},
                    {"name": "Levadura Fresca Calsa 50g", "barcode": "7790080131234", "sale_price": Decimal("600.00"), "cost_price": Decimal("400.00"), "unit_type": "unit"},
                ],
            },
        ],
    },
    "verduleria_fruteria": {
        "id": "verduleria_fruteria",
        "name": "Verdulería & Frutería",
        "description": "Papas, cebollas, tomates, bananas, manzanas y frutas/verduras frescas por kilo.",
        "icon": "leaf",
        "catalog": [
            {
                "category": "Verdulería & Frutería",
                "products": [
                    {"name": "Papa Negra", "barcode": "", "sale_price": Decimal("850.00"), "cost_price": Decimal("550.00"), "unit_type": "kg"},
                    {"name": "Papa Cepillada / Lavada", "barcode": "", "sale_price": Decimal("1200.00"), "cost_price": Decimal("800.00"), "unit_type": "kg"},
                    {"name": "Cebolla", "barcode": "", "sale_price": Decimal("900.00"), "cost_price": Decimal("600.00"), "unit_type": "kg"},
                    {"name": "Tomate Redondo", "barcode": "", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1300.00"), "unit_type": "kg"},
                    {"name": "Tomate Perita", "barcode": "", "sale_price": Decimal("1700.00"), "cost_price": Decimal("1150.00"), "unit_type": "kg"},
                    {"name": "Zanahoria", "barcode": "", "sale_price": Decimal("1100.00"), "cost_price": Decimal("750.00"), "unit_type": "kg"},
                    {"name": "Lechuga Criolla / Mantecosa", "barcode": "", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1600.00"), "unit_type": "kg"},
                    {"name": "Zapallito Verde", "barcode": "", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1200.00"), "unit_type": "kg"},
                    {"name": "Calabaza / Anco", "barcode": "", "sale_price": Decimal("950.00"), "cost_price": Decimal("650.00"), "unit_type": "kg"},
                    {"name": "Pimiento / Morrón Rojo", "barcode": "", "sale_price": Decimal("3900.00"), "cost_price": Decimal("2700.00"), "unit_type": "kg"},
                    {"name": "Acelga paquete", "barcode": "", "sale_price": Decimal("1500.00"), "cost_price": Decimal("1000.00"), "unit_type": "unit"},
                    {"name": "Palta Hass", "barcode": "", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1200.00"), "unit_type": "unit"},
                    {"name": "Limón", "barcode": "", "sale_price": Decimal("1400.00"), "cost_price": Decimal("950.00"), "unit_type": "kg"},
                    {"name": "Ajo cabeza", "barcode": "", "sale_price": Decimal("700.00"), "cost_price": Decimal("450.00"), "unit_type": "unit"},
                    {"name": "Banana Ecuador", "barcode": "", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1550.00"), "unit_type": "kg"},
                    {"name": "Manzana Roja Elegida", "barcode": "", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1650.00"), "unit_type": "kg"},
                    {"name": "Manzana Verde", "barcode": "", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1800.00"), "unit_type": "kg"},
                    {"name": "Naranja de Jugo", "barcode": "", "sale_price": Decimal("1300.00"), "cost_price": Decimal("850.00"), "unit_type": "kg"},
                    {"name": "Mandarina", "barcode": "", "sale_price": Decimal("1500.00"), "cost_price": Decimal("1000.00"), "unit_type": "kg"},
                    {"name": "Pera Williams", "barcode": "", "sale_price": Decimal("2100.00"), "cost_price": Decimal("1400.00"), "unit_type": "kg"},
                    {"name": "Frutillas", "barcode": "", "sale_price": Decimal("5200.00"), "cost_price": Decimal("3800.00"), "unit_type": "kg"},
                ],
            },
        ],
    },
    "panaderia_confiteria": {
        "id": "panaderia_confiteria",
        "name": "Panadería & Confitería",
        "description": "Pan por kilo, criollos, facturas surtidas, medialunas, chipá y sándwiches de miga.",
        "icon": "bread",
        "catalog": [
            {
                "category": "Panadería & Confitería",
                "products": [
                    {"name": "Pan (por kilo)", "barcode": "", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1700.00"), "unit_type": "kg"},
                    {"name": "Pan Criollo / Mignon", "barcode": "", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1800.00"), "unit_type": "kg"},
                    {"name": "Pan de Molde / Lactal Blanco", "barcode": "7790580199111", "sale_price": Decimal("2200.00"), "cost_price": Decimal("1550.00"), "unit_type": "unit"},
                    {"name": "Facturas Surtidas x docena", "barcode": "", "sale_price": Decimal("7200.00"), "cost_price": Decimal("4800.00"), "unit_type": "unit"},
                    {"name": "Facturas Surtidas c/u", "barcode": "", "sale_price": Decimal("650.00"), "cost_price": Decimal("420.00"), "unit_type": "unit"},
                    {"name": "Medialunas de Manteca c/u", "barcode": "", "sale_price": Decimal("700.00"), "cost_price": Decimal("450.00"), "unit_type": "unit"},
                    {"name": "Medialunas de Grasa c/u", "barcode": "", "sale_price": Decimal("650.00"), "cost_price": Decimal("420.00"), "unit_type": "unit"},
                    {"name": "Chipá correntino", "barcode": "", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1100.00"), "unit_type": "100g"},
                    {"name": "Bizcochitos de Grasa", "barcode": "", "sale_price": Decimal("900.00"), "cost_price": Decimal("600.00"), "unit_type": "100g"},
                    {"name": "Sándwich de Miga Jamón y Queso", "barcode": "", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1200.00"), "unit_type": "unit"},
                    {"name": "Sándwich de Miga Salame y Queso", "barcode": "", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1200.00"), "unit_type": "unit"},
                    {"name": "Porción de Torta Artesanal", "barcode": "", "sale_price": Decimal("3500.00"), "cost_price": Decimal("2200.00"), "unit_type": "unit"},
                    {"name": "Pasta Frola Membrillo", "barcode": "", "sale_price": Decimal("4200.00"), "cost_price": Decimal("2800.00"), "unit_type": "unit"},
                    {"name": "Pasta Frola Batata", "barcode": "", "sale_price": Decimal("4200.00"), "cost_price": Decimal("2800.00"), "unit_type": "unit"},
                    {"name": "Alfajor de Maicena artesanal", "barcode": "", "sale_price": Decimal("1200.00"), "cost_price": Decimal("750.00"), "unit_type": "unit"},
                    {"name": "Budín Casero Vainilla", "barcode": "", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1700.00"), "unit_type": "unit"},
                ],
            },
        ],
    },
    "limpieza_perfumeria": {
        "id": "limpieza_perfumeria",
        "name": "Limpieza & Perfumería",
        "description": "Lavandinas, detergentes, skip, papel higiénico, desodorantes y shampoo.",
        "icon": "shield",
        "catalog": [
            {
                "category": "Limpieza & Perfumería",
                "products": [
                    {"name": "Lavandina Ayudín Clásica 1L", "barcode": "7790580133333", "sale_price": Decimal("1600.00"), "cost_price": Decimal("1180.00"), "unit_type": "unit"},
                    {"name": "Detergente Magistral Limón 500ml", "barcode": "7790580134444", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00"), "unit_type": "unit"},
                    {"name": "Detergente Ala Limón 500ml", "barcode": "7790580135555", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1300.00"), "unit_type": "unit"},
                    {"name": "Limpiador Líquido Poett Primavera 900ml", "barcode": "7790580136666", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1400.00"), "unit_type": "unit"},
                    {"name": "Jabón Líquido para Ropa Skip 1L", "barcode": "7790580137777", "sale_price": Decimal("4900.00"), "cost_price": Decimal("3700.00"), "unit_type": "unit"},
                    {"name": "Jabón en Polvo Ala 800g", "barcode": "7790580138888", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1750.00"), "unit_type": "unit"},
                    {"name": "Suavizante Vivere Clásico 900ml", "barcode": "7790580139999", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00"), "unit_type": "unit"},
                    {"name": "Papel Higiénico Higienol Max 4u", "barcode": "7790580141111", "sale_price": Decimal("2800.00"), "cost_price": Decimal("2100.00"), "unit_type": "unit"},
                    {"name": "Rollo de Cocina Sussex Clásico 3u", "barcode": "7790580142222", "sale_price": Decimal("2400.00"), "cost_price": Decimal("1800.00"), "unit_type": "unit"},
                    {"name": "Bolsas de Residuos 45x55 10u", "barcode": "7790580143333", "sale_price": Decimal("1100.00"), "cost_price": Decimal("750.00"), "unit_type": "unit"},
                    {"name": "Esponja Mortimer Doble Uso", "barcode": "7790580144444", "sale_price": Decimal("950.00"), "cost_price": Decimal("650.00"), "unit_type": "unit"},
                    {"name": "Trapo de Piso Gris Reforzado", "barcode": "", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1200.00"), "unit_type": "unit"},
                    {"name": "Desodorante Rexona Aerosol Hombre 150ml", "barcode": "7790580145555", "sale_price": Decimal("3600.00"), "cost_price": Decimal("2700.00"), "unit_type": "unit"},
                    {"name": "Desodorante Rexona Aerosol Mujer 150ml", "barcode": "7790580146666", "sale_price": Decimal("3600.00"), "cost_price": Decimal("2700.00"), "unit_type": "unit"},
                    {"name": "Shampoo Sedal Ceramidas 350ml", "barcode": "7790580147777", "sale_price": Decimal("3200.00"), "cost_price": Decimal("2400.00"), "unit_type": "unit"},
                    {"name": "Acondicionador Sedal Ceramidas 350ml", "barcode": "7790580148888", "sale_price": Decimal("3200.00"), "cost_price": Decimal("2400.00"), "unit_type": "unit"},
                    {"name": "Jabón de Tocador Dove Original 90g", "barcode": "7790580149999", "sale_price": Decimal("1400.00"), "cost_price": Decimal("1020.00"), "unit_type": "unit"},
                    {"name": "Jabón de Tocador Rexona 90g", "barcode": "7790580151111", "sale_price": Decimal("950.00"), "cost_price": Decimal("680.00"), "unit_type": "unit"},
                    {"name": "Crema Dental Colgate Total 12 90g", "barcode": "7790580152222", "sale_price": Decimal("2600.00"), "cost_price": Decimal("1950.00"), "unit_type": "unit"},
                    {"name": "Toallitas Femeninas Always Suave 8u", "barcode": "7790580153333", "sale_price": Decimal("1900.00"), "cost_price": Decimal("1350.00"), "unit_type": "unit"},
                    {"name": "Alcohol en Gel 250ml", "barcode": "7790580155555", "sale_price": Decimal("1800.00"), "cost_price": Decimal("1250.00"), "unit_type": "unit"},
                ],
            },
        ],
    },
}


def import_starter_catalog_for_user(user, preset_keys=None):
    """
    Imports the starter catalog presets for the given user.
    If preset_keys is provided, only imports those presets.
    Otherwise imports all presets.
    Never duplicates or overwrites existing products.
    """
    if not preset_keys:
        chosen_presets = list(RUBRO_PRESETS.values())
    else:
        chosen_presets = [
            RUBRO_PRESETS[k] for k in preset_keys if k in RUBRO_PRESETS
        ]

    created_categories_count = 0
    created_products_count = 0
    imported_preset_ids = []

    with db_transaction.atomic():
        for preset in chosen_presets:
            imported_preset_ids.append(preset["id"])
            for group in preset["catalog"]:
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
                    barcode = item.get("barcode") or None

                    # If user already has a product with this name, don't create or overwrite
                    if Product.objects.filter(user=user, name=product_name).exists():
                        continue

                    # If barcode is specified, check if user already has a product with this barcode
                    if barcode and Product.objects.filter(user=user, barcode=barcode).exists():
                        barcode = None

                    Product.objects.create(
                        user=user,
                        category=category,
                        name=product_name,
                        unit_type=unit_type,
                        sale_price=item["sale_price"],
                        cost_price=item.get("cost_price", Decimal("0.00")),
                        barcode=barcode,
                        min_stock=item.get("min_stock", 1),
                        is_active=True,
                    )
                    created_products_count += 1

    return {
        "created_categories": created_categories_count,
        "created_products": created_products_count,
        "imported_presets": imported_preset_ids,
    }


