import {type Cradle} from '@fastify/awilix';
import {eq} from 'drizzle-orm';
import {type INotificationService} from '../notifications.port.js';
import {products, type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';
import { ONE_DAY } from './constants.js';

export class ProductService {
	private readonly notificationService: INotificationService;
	private readonly database: Database;

	public constructor({notificationService, database}: Pick<Cradle, 'notificationService' | 'database'>) {
		this.notificationService = notificationService;
		this.database = database;
	}

	public async notifyDelay(product: Product): Promise<void> {
		this.notificationService.sendDelayNotification(product.leadTime, product.name);
	}

	public async processProductOrder(product: Product): Promise<void>{
		switch (product.type) {
			case 'NORMAL':
				await this.processNormalProduct(product);
				break;
			case 'SEASONAL':
				await this.processSeasonalProduct(product);
				break;
			case 'EXPIRABLE':
				await this.processExpirableProduct(product);
				break;
		}
	}

	private async processNormalProduct(product: Product): Promise<void>{
		 if (product.available > 0) {
        	await this.decrementStock(product);
    	} else if (product.leadTime > 0) {
        	await this.notifyDelay(product);
    	}
	}
	
	private async processSeasonalProduct(product: Product): Promise<void>{
	    const currentDate = new Date();
		const isInSeason = currentDate > product.seasonStartDate! && currentDate < product.seasonEndDate!;

		if (isInSeason && product.available > 0) {
			await this.decrementStock(product);
		} else {
			await this.handleSeasonalProduct(product);
		}
	}

	private async processExpirableProduct(product: Product): Promise<void> {
		const currentDate = new Date();
		const isNotExpired = product.expiryDate! > currentDate;

		if (product.available > 0 && isNotExpired) {
			await this.decrementStock(product);
		} else {
			await this.handleExpiredProduct(product);
		}
	}

	public async handleSeasonalProduct(product: Product): Promise<void> {
		const currentDate = new Date();
		const leadTimeEnd = new Date(currentDate.getTime() + product.leadTime * ONE_DAY);

		if (product.seasonStartDate! > currentDate || leadTimeEnd > product.seasonEndDate!) {
			product.available = 0;
			await this.database.update(products).set(product).where(eq(products.id, product.id));
			this.notificationService.sendOutOfStockNotification(product.name);
		} else {
			await this.notifyDelay(product);
		}
	}

	public async handleExpiredProduct(product: Product): Promise<void> {
		const currentDate = new Date();
		if (product.available > 0 && product.expiryDate! > currentDate) {
			product.available -= 1;
		} else {
			product.available = 0;
			this.notificationService.sendExpirationNotification(product.name, product.expiryDate!);
		}
		await this.database.update(products).set(product).where(eq(products.id, product.id));
	}

	private async decrementStock(product: Product): Promise<void> {
		product.available -= 1;
		await this.database.update(products).set(product).where(eq(products.id, product.id));
	}
}
