import { z } from 'zod';

export const idParam = z.coerce.number().int().positive();

export const productQuery = z
  .object({
    category: z.string().trim().min(1).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: 'minPrice non può essere maggiore di maxPrice',
    path: ['minPrice'],
  });

export const createOrderBody = z.object({
  email: z.string().trim().email('Email non valida'),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "L'ordine deve contenere almeno un prodotto")
    .max(50),
});

export const topProductsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
