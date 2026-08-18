import { db } from '@/lib/db';
import {
  contentDatasets,
  sections,
  sectionItems,
  type ContentDataset,
  type Section,
  type SectionItem,
} from '@/lib/db/schema';
import {
  type CreateContentDatasetInput,
  type UpdateContentDatasetInput,
  type CreateSectionInput,
  type UpdateSectionInput,
  type CreateSectionItemInput,
  type UpdateSectionItemInput,
} from '@/lib/validators/content.validator';
import { and, asc, eq } from 'drizzle-orm';

export class ContentService {
  // ============================================================
  // CONTENT DATASETS
  // ============================================================

  static async getDatasets(userId: string): Promise<ContentDataset[]> {
    return db
      .select()
      .from(contentDatasets)
      .where(eq(contentDatasets.userId, userId))
      .orderBy(asc(contentDatasets.createdAt));
  }

  static async getDatasetById(id: string, userId?: string) {
    const conditions = [eq(contentDatasets.id, id)];
    if (userId) {
      conditions.push(eq(contentDatasets.userId, userId));
    }

    const result = await db.query.contentDatasets.findFirst({
      where: and(...conditions),
      with: {
        sections: {
          orderBy: [asc(sections.displayOrder)],
          with: {
            items: {
              orderBy: [asc(sectionItems.displayOrder)],
            },
          },
        },
      },
    });

    return result || null;
  }

  static async createDataset(userId: string, input: CreateContentDatasetInput): Promise<ContentDataset> {
    const [dataset] = await db
      .insert(contentDatasets)
      .values({
        userId,
        name: input.name,
        rawJson: input.rawJson || null,
        basics: input.basics || null,
        summary: input.summary || null,
        picture: input.picture || null,
      })
      .returning();

    return dataset;
  }

  static async updateDataset(
    id: string,
    userId: string,
    input: UpdateContentDatasetInput
  ): Promise<ContentDataset | null> {
    const [updated] = await db
      .update(contentDatasets)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(contentDatasets.id, id), eq(contentDatasets.userId, userId)))
      .returning();

    return updated || null;
  }

  static async deleteDataset(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(contentDatasets)
      .where(and(eq(contentDatasets.id, id), eq(contentDatasets.userId, userId)))
      .returning({ id: contentDatasets.id });

    return !!deleted;
  }

  // ============================================================
  // SECTIONS
  // ============================================================

  static async getSections(contentDatasetId: string): Promise<Section[]> {
    return db
      .select()
      .from(sections)
      .where(eq(sections.contentDatasetId, contentDatasetId))
      .orderBy(asc(sections.displayOrder));
  }

  static async getSectionById(sectionId: string) {
    return db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
      with: {
        items: {
          orderBy: [asc(sectionItems.displayOrder)],
        },
      },
    });
  }

  static async createSection(contentDatasetId: string, input: CreateSectionInput): Promise<Section> {
    const [section] = await db
      .insert(sections)
      .values({
        contentDatasetId,
        type: input.type,
        title: input.title,
        icon: input.icon ?? '',
        columns: input.columns ?? 1,
        hidden: input.hidden ?? false,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning();

    return section;
  }

  static async updateSection(sectionId: string, input: UpdateSectionInput): Promise<Section | null> {
    const [updated] = await db
      .update(sections)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(sections.id, sectionId))
      .returning();

    return updated || null;
  }

  static async deleteSection(sectionId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(sections)
      .where(eq(sections.id, sectionId))
      .returning({ id: sections.id });

    return !!deleted;
  }

  static async reorderSections(contentDatasetId: string, sectionIds: string[]): Promise<boolean> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < sectionIds.length; i++) {
        await tx
          .update(sections)
          .set({ displayOrder: i, updatedAt: new Date() })
          .where(and(eq(sections.id, sectionIds[i]), eq(sections.contentDatasetId, contentDatasetId)));
      }
    });

    return true;
  }

  // ============================================================
  // SECTION ITEMS
  // ============================================================

  static async getSectionItems(sectionId: string): Promise<SectionItem[]> {
    return db
      .select()
      .from(sectionItems)
      .where(eq(sectionItems.sectionId, sectionId))
      .orderBy(asc(sectionItems.displayOrder));
  }

  static async getSectionItemById(itemId: string): Promise<SectionItem | null> {
    const [item] = await db
      .select()
      .from(sectionItems)
      .where(eq(sectionItems.id, itemId))
      .limit(1);

    return item || null;
  }

  static async createSectionItem(sectionId: string, input: CreateSectionItemInput): Promise<SectionItem> {
    const [item] = await db
      .insert(sectionItems)
      .values({
        sectionId,
        data: input.data,
        hidden: input.hidden ?? false,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning();

    return item;
  }

  static async updateSectionItem(itemId: string, input: UpdateSectionItemInput): Promise<SectionItem | null> {
    const [updated] = await db
      .update(sectionItems)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(sectionItems.id, itemId))
      .returning();

    return updated || null;
  }

  static async deleteSectionItem(itemId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(sectionItems)
      .where(eq(sectionItems.id, itemId))
      .returning({ id: sectionItems.id });

    return !!deleted;
  }

  static async reorderSectionItems(sectionId: string, itemIds: string[]): Promise<boolean> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < itemIds.length; i++) {
        await tx
          .update(sectionItems)
          .set({ displayOrder: i, updatedAt: new Date() })
          .where(and(eq(sectionItems.id, itemIds[i]), eq(sectionItems.sectionId, sectionId)));
      }
    });

    return true;
  }
}
