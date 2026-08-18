import { db } from '@/lib/db';
import { portfolioItems, sectionItems, type PortfolioItem } from '@/lib/db/schema';
import {
  type CreatePortfolioItemInput,
  type UpdatePortfolioItemInput,
} from '@/lib/validators/portfolio.validator';
import { and, desc, eq } from 'drizzle-orm';

export interface PortfolioQueryOptions {
  status?: 'draft' | 'published';
  limit?: number;
  offset?: number;
}

export class PortfolioService {
  static async getPortfolioItems(userId: string, options: PortfolioQueryOptions = {}): Promise<PortfolioItem[]> {
    const conditions = [eq(portfolioItems.userId, userId)];

    if (options.status) {
      conditions.push(eq(portfolioItems.status, options.status));
    }

    return db
      .select()
      .from(portfolioItems)
      .where(and(...conditions))
      .orderBy(desc(portfolioItems.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);
  }

  static async getPortfolioItemById(id: string, userId?: string) {
    const conditions = [eq(portfolioItems.id, id)];
    if (userId) {
      conditions.push(eq(portfolioItems.userId, userId));
    }

    const result = await db.query.portfolioItems.findFirst({
      where: and(...conditions),
      with: {
        projectItem: true,
      },
    });

    return result || null;
  }

  static async getPublicPortfolioItem(id: string) {
    const result = await db.query.portfolioItems.findFirst({
      where: and(eq(portfolioItems.id, id), eq(portfolioItems.status, 'published')),
      with: {
        projectItem: true,
      },
    });

    return result || null;
  }

  static async createPortfolioItem(userId: string, input: CreatePortfolioItemInput): Promise<PortfolioItem> {
    const publishedAt =
      input.status === 'published'
        ? input.publishedAt
          ? new Date(input.publishedAt)
          : new Date()
        : null;

    const [item] = await db
      .insert(portfolioItems)
      .values({
        userId,
        title: input.title,
        subtitle: input.subtitle || null,
        projectItemId: input.projectItemId || null,
        coverImageUrl: input.coverImageUrl || null,
        markdownBody: input.markdownBody || '',
        tags: input.tags || [],
        links: input.links || [],
        status: input.status || 'draft',
        publishedAt,
      })
      .returning();

    return item;
  }

  static async updatePortfolioItem(
    id: string,
    userId: string,
    input: UpdatePortfolioItemInput
  ): Promise<PortfolioItem | null> {
    const updateData: Record<string, any> = {
      ...input,
      updatedAt: new Date(),
    };

    if (input.status === 'published' && input.publishedAt) {
      updateData.publishedAt = new Date(input.publishedAt);
    } else if (input.status === 'published' && !input.publishedAt) {
      updateData.publishedAt = new Date();
    } else if (input.status === 'draft') {
      updateData.publishedAt = null;
    }

    const [updated] = await db
      .update(portfolioItems)
      .set(updateData)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.userId, userId)))
      .returning();

    return updated || null;
  }

  static async deletePortfolioItem(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(portfolioItems)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.userId, userId)))
      .returning({ id: portfolioItems.id });

    return !!deleted;
  }
}
