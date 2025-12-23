/* eslint-disable @typescript-eslint/switch-exhaustiveness-check */
/* eslint-disable max-depth */
/* eslint-disable no-await-in-loop */
import {eq} from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import {serializerCompiler, validatorCompiler, type ZodTypeProvider} from 'fastify-type-provider-zod';
import {z} from 'zod';
import {orders} from '@/db/schema.js';

export const myController = fastifyPlugin(async server => {
	// Add schema validator and serializer
	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	server.withTypeProvider<ZodTypeProvider>().post('/orders/:orderId/processOrder', {
		schema: {
			params: z.object({
				orderId: z.coerce.number(),
			}),
		},
	}, async (request, reply) => {
		const database = server.diContainer.resolve('database');
		const productService = server.diContainer.resolve('productService');
		const order = (await database.query.orders
			.findFirst({
				where: eq(orders.id, request.params.orderId),
				with: {
					products: {
						columns: {},
						with: {
							product: true,
						},
					},
				},
			}))!;
			
		const {products: productList} = order;

		if (productList && Array.isArray(productList) && productList.length > 0) {
			for (const {product} of productList) {
				await productService.processProductOrder(product)
			}
		}

		await reply.send({orderId: order.id});
	});
});

