import { db } from '@/lib/db';
import { portfolioItems, contentDatasets, sections, projectArticleLinks, type PortfolioItem, type SectionItem, type ProjectArticleLink } from '@/lib/db/schema';
import {
  type CreatePortfolioItemInput,
  type UpdatePortfolioItemInput,
} from '@/lib/validators/portfolio.validator';
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';

export interface PortfolioQueryOptions {
  status?: 'draft' | 'published';
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PortfolioItemWithProject extends PortfolioItem {
  projectItem?: SectionItem | null;
}

export interface AvailableProjectItem {
  id: string;
  datasetId: string;
  datasetName: string;
  sectionId: string;
  sectionTitle: string;
  name: string;
  period?: string;
  website?: string;
  description?: string;
  data: Record<string, unknown>;
}

export class PortfolioService {
  static async getPortfolioItems(
    userId: string,
    options: PortfolioQueryOptions = {}
  ): Promise<PortfolioItemWithProject[]> {
    const conditions = [eq(portfolioItems.userId, userId)];

    if (options.status) {
      conditions.push(eq(portfolioItems.status, options.status));
    }

    if (options.search && options.search.trim() !== '') {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(portfolioItems.title, searchPattern),
          ilike(portfolioItems.subtitle, searchPattern),
          ilike(portfolioItems.markdownBody, searchPattern)
        )!
      );
    }

    const items = await db.query.portfolioItems.findMany({
      where: and(...conditions),
      orderBy: [desc(portfolioItems.createdAt)],
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
      with: {
        projectItem: true,
      },
    });

    if (options.tag && options.tag.trim() !== '') {
      const targetTag = options.tag.trim().toLowerCase();
      return items.filter((item) => {
        const tags = (item.tags as string[]) || [];
        return tags.some((t) => t.toLowerCase() === targetTag);
      });
    }

    return items;
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
    try {
      const result = await db.query.portfolioItems.findFirst({
        where: and(eq(portfolioItems.id, id), eq(portfolioItems.status, 'published')),
        with: {
          projectItem: true,
        },
      });

      return result || null;
    } catch (error) {
      console.warn('Database offline or unreachable while fetching public portfolio item:', error);
      return null;
    }
  }

  static async getPublicPortfolioItems(
    options: { tag?: string; search?: string; limit?: number; offset?: number } = {}
  ): Promise<PortfolioItemWithProject[]> {
    try {
      const conditions = [eq(portfolioItems.status, 'published')];

      if (options.search && options.search.trim() !== '') {
        const searchPattern = `%${options.search.trim()}%`;
        conditions.push(
          or(
            ilike(portfolioItems.title, searchPattern),
            ilike(portfolioItems.subtitle, searchPattern),
            ilike(portfolioItems.markdownBody, searchPattern)
          )!
        );
      }

      const items = await db.query.portfolioItems.findMany({
        where: and(...conditions),
        orderBy: [desc(portfolioItems.publishedAt), desc(portfolioItems.createdAt)],
        limit: options.limit ?? 100,
        offset: options.offset ?? 0,
        with: {
          projectItem: true,
        },
      });

      if (options.tag && options.tag.trim() !== '') {
        const targetTag = options.tag.trim().toLowerCase();
        return items.filter((item) => {
          const tags = (item.tags as string[]) || [];
          return tags.some((t) => t.toLowerCase() === targetTag);
        });
      }

      return items;
    } catch (error) {
      console.warn('Database offline or unreachable while fetching public portfolio items:', error);
      return [];
    }
  }

  static async getPublishedPortfolioByProjectItemIds(
    projectItemIds: string[]
  ): Promise<Record<string, Array<{ id: string; title: string; subtitle: string | null; coverImageUrl: string | null }>>> {
    if (projectItemIds.length === 0) return {};

    try {
      const links = await db.query.projectArticleLinks.findMany({
        where: inArray(projectArticleLinks.sectionItemId, projectItemIds),
        with: {
          portfolioItem: true,
        },
        orderBy: [desc(projectArticleLinks.displayOrder), desc(projectArticleLinks.createdAt)],
      });

      const map: Record<string, Array<{ id: string; title: string; subtitle: string | null; coverImageUrl: string | null }>> = {};
      
      for (const link of links) {
        if (link.portfolioItem && link.portfolioItem.status === 'published') {
          if (!map[link.sectionItemId]) {
            map[link.sectionItemId] = [];
          }
          map[link.sectionItemId].push({
            id: link.portfolioItem.id,
            title: link.portfolioItem.title,
            subtitle: link.portfolioItem.subtitle,
            coverImageUrl: link.portfolioItem.coverImageUrl,
          });
        }
      }

      return map;
    } catch (error) {
      console.warn('Database offline or unreachable while fetching portfolio links by project item IDs:', error);
      return {};
    }
  }

  // --- Junction Table Methods ---

  static async getArticlesForSectionItem(sectionItemId: string) {
    const links = await db.query.projectArticleLinks.findMany({
      where: eq(projectArticleLinks.sectionItemId, sectionItemId),
      with: {
        portfolioItem: true,
      },
      orderBy: [desc(projectArticleLinks.displayOrder), desc(projectArticleLinks.createdAt)],
    });

    return links.map(link => ({
      linkId: link.id,
      portfolioItemId: link.portfolioItemId,
      title: link.portfolioItem?.title,
      subtitle: link.portfolioItem?.subtitle,
      coverImageUrl: link.portfolioItem?.coverImageUrl,
      status: link.portfolioItem?.status,
      isPrimary: link.isPrimary,
      displayOrder: link.displayOrder,
    }));
  }

  static async getSectionItemsForArticle(portfolioItemId: string) {
    const links = await db.query.projectArticleLinks.findMany({
      where: eq(projectArticleLinks.portfolioItemId, portfolioItemId),
      with: {
        sectionItem: true,
      },
      orderBy: [desc(projectArticleLinks.displayOrder), desc(projectArticleLinks.createdAt)],
    });

    return links.map(link => ({
      linkId: link.id,
      sectionItemId: link.sectionItemId,
      isPrimary: link.isPrimary,
      displayOrder: link.displayOrder,
      sectionItem: link.sectionItem,
    }));
  }

  static async linkArticleToProject(sectionItemId: string, portfolioItemId: string, isPrimary = false) {
    try {
      const [link] = await db
        .insert(projectArticleLinks)
        .values({
          sectionItemId,
          portfolioItemId,
          isPrimary,
        })
        .returning();

      if (isPrimary) {
        await db.update(portfolioItems)
          .set({ projectItemId: sectionItemId })
          .where(eq(portfolioItems.id, portfolioItemId));
      }

      return link;
    } catch (error: any) {
      // If it's a unique constraint violation, return existing link
      if (error.code === '23505') {
        const existing = await db.query.projectArticleLinks.findFirst({
          where: and(
            eq(projectArticleLinks.sectionItemId, sectionItemId),
            eq(projectArticleLinks.portfolioItemId, portfolioItemId)
          )
        });
        
        if (existing) {
           if (isPrimary && !existing.isPrimary) {
             await this.updateArticleLink(existing.id, { isPrimary: true });
             await db.update(portfolioItems)
               .set({ projectItemId: sectionItemId })
               .where(eq(portfolioItems.id, portfolioItemId));
             return { ...existing, isPrimary: true };
           }
           return existing;
        }
      }
      throw error;
    }
  }

  static async unlinkArticleFromProject(sectionItemId: string, portfolioItemId: string) {
    const [deleted] = await db
      .delete(projectArticleLinks)
      .where(
        and(
          eq(projectArticleLinks.sectionItemId, sectionItemId),
          eq(projectArticleLinks.portfolioItemId, portfolioItemId)
        )
      )
      .returning();

    if (deleted && deleted.isPrimary) {
      await db.update(portfolioItems)
        .set({ projectItemId: null })
        .where(
          and(
            eq(portfolioItems.id, portfolioItemId),
            eq(portfolioItems.projectItemId, sectionItemId)
          )
        );
    }

    return deleted;
  }

  static async updateArticleLink(linkId: string, updates: { isPrimary?: boolean; displayOrder?: number }) {
    const [updated] = await db
      .update(projectArticleLinks)
      .set(updates)
      .where(eq(projectArticleLinks.id, linkId))
      .returning();

    if (updated && updates.isPrimary !== undefined) {
      if (updates.isPrimary) {
        await db.update(portfolioItems)
          .set({ projectItemId: updated.sectionItemId })
          .where(eq(portfolioItems.id, updated.portfolioItemId));
      } else {
        await db.update(portfolioItems)
          .set({ projectItemId: null })
          .where(
            and(
              eq(portfolioItems.id, updated.portfolioItemId),
              eq(portfolioItems.projectItemId, updated.sectionItemId)
            )
          );
      }
    }

    return updated;
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
    const updateData: Record<string, unknown> = {
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

  static async duplicatePortfolioItem(id: string, userId: string): Promise<PortfolioItem | null> {
    const original = await this.getPortfolioItemById(id, userId);
    if (!original) {
      return null;
    }

    const [cloned] = await db
      .insert(portfolioItems)
      .values({
        userId,
        title: `${original.title} (Copy)`,
        subtitle: original.subtitle,
        projectItemId: original.projectItemId,
        coverImageUrl: original.coverImageUrl,
        markdownBody: original.markdownBody,
        tags: original.tags || [],
        links: original.links || [],
        status: 'draft',
        publishedAt: null,
      })
      .returning();

    return cloned || null;
  }

  static async deletePortfolioItem(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(portfolioItems)
      .where(and(eq(portfolioItems.id, id), eq(portfolioItems.userId, userId)))
      .returning({ id: portfolioItems.id });

    return !!deleted;
  }

  static async getProjectItems(userId: string): Promise<AvailableProjectItem[]> {
    const datasets = await db.query.contentDatasets.findMany({
      where: eq(contentDatasets.userId, userId),
      with: {
        sections: {
          where: eq(sections.type, 'projects'),
          with: {
            items: true,
          },
        },
      },
    });

    const projectItems: AvailableProjectItem[] = [];

    for (const ds of datasets) {
      for (const sec of ds.sections) {
        for (const it of sec.items) {
          const itemData = (it.data as Record<string, unknown>) || {};
          projectItems.push({
            id: it.id,
            datasetId: ds.id,
            datasetName: ds.name,
            sectionId: sec.id,
            sectionTitle: sec.title,
            name: (itemData.name as string) || (itemData.title as string) || 'Untitled Project',
            period: (itemData.period as string) || (itemData.date as string) || undefined,
            website: (itemData.website as string) || (itemData.url as string) || undefined,
            description: (itemData.description as string) || (itemData.summary as string) || undefined,
            data: itemData,
          });
        }
      }
    }

    return projectItems;
  }
}
