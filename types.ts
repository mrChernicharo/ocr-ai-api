interface Product {
	name: string;
	unitPrice?: number; // Optional, as it might be calculated or not explicitly present
	quantity?: number; // Optional, as it might be calculated or not explicitly present
	totalPrice: number;
	category: Category;
}

interface Bill {
	establishment?: string;
	address?: string;
	date?: string; // Format: YYYY-MM-DD
	time?: string; // Format: HH:MM:SS
	products: Product[];
	totalBill?: number;
	vatAmount?: number;
}

export enum Category {
	MEAL = 'MEAL',
	FAST_FOOD = 'FAST_FOOD',
	PIZZA_PASTA = 'PIZZA_PASTA',
	ORIENTAL_CUISINE = 'ORIENTAL_CUISINE',
	DESSERT = 'DESSERT',
	TAX = 'TAX',
	SERVICE = 'SERVICE',
	SOFT_DRINK = 'SOFT_DRINK',
	ALCOHOLIC_DRINK = 'ALCOHOLIC_DRINK',
	GROCERIES_SUPERMARKET = 'GROCERIES_SUPERMARKET',
	RETAIL_SHOPPING = 'RETAIL_SHOPPING',
	ONLINE_PURCHASE = 'ONLINE_PURCHASE',
	GIFT = 'GIFT',
	FLIGHT = 'FLIGHT',
	TRANSPORT = 'TRANSPORT', // (Car, Train, Bus, Boat)
	ACCOMMODATION = 'ACCOMMODATION',
	UTILITIES_HOME = 'UTILITIES_HOME',
	TECH = 'TECH', // (PC, Smartphone, Video game)
	HEALTH_MEDICAL = 'HEALTH_MEDICAL',
	ENTERTAINMENT_LEISURE = 'ENTERTAINMENT_LEISURE',
	EDUCATION = 'EDUCATION',
	MISCELLANEOUS = 'MISCELLANEOUS',
	UNKNOWN = 'UNKNOWN',
}
