interface Product {
	name: string;
	unitPrice?: number; // Optional, as it might be calculated or not explicitly present
	quantity?: number; // Optional, as it might be calculated or not explicitly present
	totalPrice: number;
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
	RESTAURANT = 'RESTAURANT', // Already matching
	BAR_PUB = 'BAR_PUB', // Already matching
	GROCERIES_SUPERMARKET = 'GROCERIES_SUPERMARKET',
	RETAIL_SHOPPING = 'RETAIL_SHOPPING',
	ONLINE_PURCHASE = 'ONLINE_PURCHASE',
	FLIGHT_TICKET = 'FLIGHT_TICKET',
	TRANSPORT = 'TRANSPORT', // (Car, Train, Bus, Boat)
	ACCOMMODATION = 'ACCOMMODATION',
	UTILITIES_HOME = 'UTILITIES_HOME',
	HEALTH_MEDICAL = 'HEALTH_MEDICAL',
	SERVICES = 'SERVICES', // (General)
	ENTERTAINMENT_LEISURE = 'ENTERTAINMENT_LEISURE',
	EDUCATION = 'EDUCATION',
	MISCELLANEOUS = 'MISCELLANEOUS',
	UNKNOWN = 'UNKNOWN',
}
