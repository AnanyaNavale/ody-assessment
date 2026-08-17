import { z } from "@hono/zod-openapi";
import {
  insertOrderItemSchema,
  insertOrderSchema,
  selectOrderSchema,
} from "./db";

export const CreateOrderItemSchema = insertOrderItemSchema
  .omit({
    id: true,
    orderId: true,
    priceAtTime: true,
    subtotal: true,
  })
  .extend({
    quantity: z.number().int().min(1).max(99),
    notes: z.string().optional(),
  })
  .openapi("CreateOrderItem");

export const CreateOrderSchema = insertOrderSchema
  .omit({
    id: true,
    status: true,
    subtotal: true,
    tax: true,
    total: true,
    createdAt: true,
    completedAt: true,
    updatedAt: true,
  })
  .extend({
    customerId: z.string().uuid().openapi({
      example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    }),
    items: z.array(CreateOrderItemSchema).min(1),
    notes: z.string().optional(),
    orderType: z.enum(["dine_in", "pickup", "delivery"]).optional(),
  })
  .openapi("CreateOrder");

export const UpdateOrderStatusSchema = insertOrderSchema
  .pick({
    status: true,
  })
  .required()
  .openapi("UpdateOrderStatus");

export const OrderSchema = selectOrderSchema
  .pick({
    id: true,
    customerId: true,
    status: true,
    orderType: true,
    subtotal: true,
    tax: true,
    total: true,
    notes: true,
    createdAt: true,
    completedAt: true,
    updatedAt: true,
  })
  .extend({
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Order");
