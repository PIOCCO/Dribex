"""Canonical Casablanca marketplace records (from migrations 019 + 035).

Used to idempotently restore marketplaces if they are removed from the admin UI.
Custom marketplaces created in admin are not touched.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class MarketplaceCategorySpec:
    slug: str
    name: str
    description: str
    icon: str
    display_order: int


@dataclass(frozen=True, slots=True)
class MarketplaceSpec:
    slug: str
    name: str
    description: str
    known_for: str
    address: str
    district: str
    city: str = "Casablanca"
    latitude: float = 0.0
    longitude: float = 0.0
    display_order: int = 0
    categories: tuple[MarketplaceCategorySpec, ...] = field(default_factory=tuple)


CASABLANCA_MARKETPLACE_CATALOG: tuple[MarketplaceSpec, ...] = (
    MarketplaceSpec(
        slug="derb-ghallef",
        name="Derb Ghallef",
        description="Casablanca's major electronics and mobile phone market — hundreds of shops and galleries.",
        known_for="Electronics, phones, computers, gaming, repairs, cameras and resale.",
        address="Derb Ghallef",
        district="Derb Ghallef",
        latitude=33.5789,
        longitude=-7.6100,
        display_order=1,
        categories=(
            MarketplaceCategorySpec("phones", "Phones", "Smartphones and accessories", "smartphone", 0),
            MarketplaceCategorySpec("gaming", "Gaming", "Consoles and games", "sports_esports", 1),
            MarketplaceCategorySpec("computers", "Computers", "Laptops and desktops", "computer", 2),
            MarketplaceCategorySpec("networking", "Networking", "Routers and network gear", "router", 3),
            MarketplaceCategorySpec("electronics", "Electronics", "General electronics", "devices", 4),
            MarketplaceCategorySpec("repairs", "Repairs", "Phone and device repair", "build", 5),
            MarketplaceCategorySpec("accessories", "Accessories", "Phone and device accessories", "headphones", 7),
            MarketplaceCategorySpec("cameras", "Cameras", "Cameras and photography", "photo_camera", 8),
            MarketplaceCategorySpec("tv-audio", "TV / Audio", "Televisions and audio equipment", "tv", 9),
            MarketplaceCategorySpec("furniture", "Furniture", "Furniture and home items", "chair", 10),
            MarketplaceCategorySpec("clothing", "Clothing", "Clothing and apparel", "checkroom", 11),
            MarketplaceCategorySpec("other", "Other", "Other relevant categories", "category", 99),
        ),
    ),
    MarketplaceSpec(
        slug="derb-omar",
        name="Derb Omar",
        description="Major wholesale and hardware commercial district in Casablanca.",
        known_for="Wholesale textiles, clothing, household goods, hardware and packaging.",
        address="Derb Omar",
        district="Derb Omar",
        latitude=33.5920,
        longitude=-7.6180,
        display_order=2,
        categories=(
            MarketplaceCategorySpec("construction", "Construction", "Building materials", "construction", 0),
            MarketplaceCategorySpec("hardware", "Hardware", "Tools and hardware", "hardware", 1),
            MarketplaceCategorySpec("plumbing", "Plumbing", "Pipes and fittings", "plumbing", 2),
            MarketplaceCategorySpec("electrical", "Electrical", "Electrical supplies", "electrical_services", 3),
            MarketplaceCategorySpec("wholesale", "Wholesale", "Wholesale goods", "inventory_2", 5),
            MarketplaceCategorySpec("textiles", "Textiles", "Fabrics and textiles", "texture", 6),
            MarketplaceCategorySpec("clothing", "Clothing", "Clothing wholesale", "checkroom", 7),
            MarketplaceCategorySpec("household", "Household goods", "Household products", "home", 8),
            MarketplaceCategorySpec("packaging", "Packaging", "Packaging supplies", "inventory", 9),
            MarketplaceCategorySpec("cosmetics", "Cosmetics", "Cosmetics and beauty", "spa", 10),
            MarketplaceCategorySpec("toys", "Toys", "Toys and games", "toys", 11),
            MarketplaceCategorySpec("electronics", "Electronics", "Electronics wholesale", "devices", 12),
            MarketplaceCategorySpec("other", "Other", "Other relevant categories", "category", 99),
        ),
    ),
    MarketplaceSpec(
        slug="9ri3a",
        name="Al Qurayaa",
        description="Souk Al Qurayaa (القريعة) — auto parts, mechanics and car services.",
        known_for="Auto parts, tires, mechanics and vehicle services.",
        address="Souk Al Qurayaa",
        district="القريعة",
        latitude=33.5650,
        longitude=-7.5890,
        display_order=3,
        categories=(
            MarketplaceCategorySpec("toyota-parts", "Toyota Parts", "Toyota spare parts", "directions_car", 0),
            MarketplaceCategorySpec("bmw-parts", "BMW Parts", "BMW spare parts", "directions_car", 1),
            MarketplaceCategorySpec("mercedes-parts", "Mercedes Parts", "Mercedes spare parts", "directions_car", 2),
            MarketplaceCategorySpec("tires", "Tires", "Tires and wheels", "tire_repair", 3),
            MarketplaceCategorySpec("mechanics", "Mechanics", "Mechanics and garages", "car_repair", 4),
        ),
    ),
    MarketplaceSpec(
        slug="habous",
        name="Habous",
        description="Historic Habous quarter — traditional crafts, leather, clothing and Moroccan goods.",
        known_for="Traditional clothing, leather, handicrafts, spices and Moroccan gifts.",
        address="Quartier Habous",
        district="Habous",
        latitude=33.5775,
        longitude=-7.6128,
        display_order=4,
        categories=(
            MarketplaceCategorySpec(
                "traditional-clothing",
                "Traditional clothing",
                "Djellabas, caftans and traditional wear",
                "checkroom",
                1,
            ),
            MarketplaceCategorySpec("leather", "Leather", "Leather goods and bags", "shopping_bag", 2),
            MarketplaceCategorySpec("handicrafts", "Handicrafts", "Artisan crafts and decor", "palette", 3),
            MarketplaceCategorySpec("spices", "Spices", "Spices and food products", "restaurant", 4),
            MarketplaceCategorySpec("gifts", "Gifts", "Souvenirs and gifts", "card_giftcard", 5),
            MarketplaceCategorySpec("jewelry", "Jewelry", "Jewelry and accessories", "diamond", 6),
            MarketplaceCategorySpec("home-decor", "Home decoration", "Moroccan home decor", "home", 7),
        ),
    ),
    MarketplaceSpec(
        slug="medina",
        name="Medina",
        description="Casablanca's old medina — dense commercial streets near the port and historic center.",
        known_for="Everyday goods, textiles, food, household items and local commerce.",
        address="Medina",
        district="Medina",
        latitude=33.6031,
        longitude=-7.6167,
        display_order=5,
        categories=(
            MarketplaceCategorySpec("textiles", "Textiles", "Fabrics and textiles", "texture", 1),
            MarketplaceCategorySpec("household", "Household goods", "Home and kitchen goods", "kitchen", 2),
            MarketplaceCategorySpec("food", "Food products", "Local food and pantry items", "local_grocery_store", 3),
            MarketplaceCategorySpec("clothing", "Clothing", "Everyday clothing", "checkroom", 4),
            MarketplaceCategorySpec("hardware", "Hardware", "Tools and hardware", "hardware", 5),
            MarketplaceCategorySpec("services", "Services", "Local services", "handyman", 6),
        ),
    ),
    MarketplaceSpec(
        slug="bab-marrakech",
        name="Bab Marrakech",
        description="Commercial district around Bab Marrakech — busy shopping streets in central Casablanca.",
        known_for="Mixed retail, clothing, electronics and everyday shopping.",
        address="Bab Marrakech",
        district="Bab Marrakech",
        latitude=33.5958,
        longitude=-7.6169,
        display_order=6,
        categories=(
            MarketplaceCategorySpec("clothing", "Clothing", "Fashion and apparel", "checkroom", 1),
            MarketplaceCategorySpec("electronics", "Electronics", "Electronics and accessories", "devices", 2),
            MarketplaceCategorySpec("phones", "Phones", "Mobile phones", "smartphone", 3),
            MarketplaceCategorySpec("shoes", "Shoes", "Footwear", "steps", 4),
            MarketplaceCategorySpec("accessories", "Accessories", "Bags and accessories", "shopping_bag", 5),
            MarketplaceCategorySpec("services", "Services", "Repairs and services", "build", 6),
        ),
    ),
)
