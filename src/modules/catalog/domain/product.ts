export type ProductCategory = { id: string; name: string; slug: string };

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  weightGrams: number;
  imageUrl: string;
  badges: string[];
  available: boolean;
};

export type Catalog = { categories: ProductCategory[]; products: Product[] };
