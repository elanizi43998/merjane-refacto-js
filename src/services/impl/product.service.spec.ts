import {
	describe, it, expect, beforeEach,
	afterEach,
} from 'vitest';
import {mockDeep, type DeepMockProxy} from 'vitest-mock-extended';
import {type INotificationService} from '../notifications.port.js';
import {createDatabaseMock, cleanUp} from '../../utils/test-utils/database-tools.ts.js';
import {ProductService} from './product.service.js';
import {products, type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

describe('ProductService Tests', () => {
	let notificationServiceMock: DeepMockProxy<INotificationService>;
	let productService: ProductService;
	let databaseMock: Database;
	let databaseName: string;

	beforeEach(async () => {
		({databaseMock, databaseName} = await createDatabaseMock());
		notificationServiceMock = mockDeep<INotificationService>();
		productService = new ProductService({
			notificationService: notificationServiceMock,
			database: databaseMock,
		});
	});

	afterEach(async () => cleanUp(databaseName));
	describe('NORMAL products', () => {
		it('should decrement stock when available', async () => {
			// GIVEN
			const product: Product = {
				id: 1,
				leadTime: 15,
				available: 5,
				type: 'NORMAL',
				name: 'USB Cable',
				expiryDate: null,
				seasonStartDate: null,
				seasonEndDate: null,
			};
			await databaseMock.insert(products).values(product);

			// WHEN
			await productService.processProductOrder(product);

			// THEN
			const result = await databaseMock.query.products.findFirst({
				where: (p, {eq}) => eq(p.id, 1),
			});
			expect(result!.available).toBe(4);
		});

      it('should do nothing when out of stock and leadTime = 0', async ()=> {
          // GIVEN
          const product: Product = {
              id: 3,
              leadTime: 0,
              available: 0,
              type: 'NORMAL',
              name: 'Out of Stock Item',
              expiryDate: null,
              seasonStartDate: null,
              seasonEndDate: null,
          };
          await databaseMock.insert(products).values(product);

          // WHEN
          await productService.processProductOrder(product);

          // THEN
          expect(notificationServiceMock.sendDelayNotification).not.toHaveBeenCalled();
          const result = await databaseMock.query.products.findFirst({
              where: (p, {eq}) => eq(p.id, 3),
          });
          expect(result!.available).toBe(0);
      });

		it('should notify delay when out of stock', async () => {
			// GIVEN
			const product: Product = {
				id: 2,
				leadTime: 15,
				available: 0,
				type: 'NORMAL',
				name: 'Mac',
				expiryDate: null,
				seasonStartDate: null,
				seasonEndDate: null,
			};
			await databaseMock.insert(products).values(product);

			// WHEN
			await productService.processProductOrder(product);

			// THEN
			expect(notificationServiceMock.sendDelayNotification).toHaveBeenCalledWith(15, 'Mac');
		});

	});

	

	describe('SEASONAL products', () => {
		it('should decrement stock when in season and available', async () => {
			// GIVEN
			const currentDate = Date.now();
			const d = 24 * 60 * 60 * 1000;
			const product: Product = {
				id: 3,
				leadTime: 15,
				available: 30,
				type: 'SEASONAL',
				name: 'Watermelon',
				expiryDate: null,
				seasonStartDate: new Date(currentDate - (2 * d)),
				seasonEndDate: new Date(currentDate + (58 * d)),
			};
			await databaseMock.insert(products).values(product);

			// WHEN
			await productService.processProductOrder(product);

			// THEN
			const result = await databaseMock.query.products.findFirst({
				where: (p, {eq}) => eq(p.id, 3),
			});
			expect(result!.available).toBe(29);
		});

		it('should notify out of stock when out of season', async () => {
			// GIVEN
			const currentDate = Date.now();
			const d = 24 * 60 * 60 * 1000;
			const product: Product = {
				id: 4,
				leadTime: 15,
				available: 30,
				type: 'SEASONAL',
				name: 'Grapes',
				expiryDate: null,
				seasonStartDate: new Date(currentDate + (180 * d)),
				seasonEndDate: new Date(currentDate + (240 * d)),
			};
			await databaseMock.insert(products).values(product);

			// WHEN
			await productService.processProductOrder(product);

			// THEN
			expect(notificationServiceMock.sendOutOfStockNotification).toHaveBeenCalledWith('Grapes');
		});
	});

	describe('EXPIRABLE products', () => {
		it('should decrement stock when not expired and available', async () => {
			// GIVEN
			const currentDate = Date.now();
			const d = 24 * 60 * 60 * 1000;
			const product: Product = {
				id: 5,
				leadTime: 15,
				available: 30,
				type: 'EXPIRABLE',
				name: 'Butter',
				expiryDate: new Date(currentDate + (26 * d)),
				seasonStartDate: null,
				seasonEndDate: null,
			};
			await databaseMock.insert(products).values(product);

			// WHEN
			await productService.processProductOrder(product);

			// THEN
			const result = await databaseMock.query.products.findFirst({
				where: (p, {eq}) => eq(p.id, 5),
			});
			expect(result!.available).toBe(29);
		});

		it('should notify expiration when expired', async () => {
			// GIVEN
			const currentDate = Date.now();
			const d = 24 * 60 * 60 * 1000;
			const expiryDate = new Date(currentDate - (2 * d));
			const product: Product = {
				id: 6,
				leadTime: 90,
				available: 6,
				type: 'EXPIRABLE',
				name: 'Milk',
				expiryDate,
				seasonStartDate: null,
				seasonEndDate: null,
			};
			await databaseMock.insert(products).values(product);

			// WHEN
			await productService.processProductOrder(product);

			// THEN
			expect(notificationServiceMock.sendExpirationNotification).toHaveBeenCalledWith('Milk', expiryDate);
			const result = await databaseMock.query.products.findFirst({
				where: (p, {eq}) => eq(p.id, 6),
			});
			expect(result!.available).toBe(0);
		});
	});
});

