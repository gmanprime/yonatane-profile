import { db } from '@/lib/db';
import {
  profiles,
  profileSections,
  contentDatasets,
  sections,
  sectionItems,
  type Profile,
  type ProfileSection,
} from '@/lib/db/schema';
import {
  type CreateProfileInput,
  type UpdateProfileInput,
  type ProfileSectionItemConfig,
} from '@/lib/validators/profile.validator';
import { ThemeService, SYSTEM_DEFAULT_THEME_CONFIG } from './theme.service';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import {
  type ResolvedProfile,
  type ResolvedProfileSection,
  type ResolvedProfileItem,
} from '@/lib/types/profile.types';

export type { ResolvedProfile, ResolvedProfileSection, ResolvedProfileItem };

export class ProfileService {
  /**
   * Generates a unique 8-character URL-safe hash for stealth links.
   */
  static async generateUniqueHash(): Promise<string> {
    let attempts = 0;
    while (attempts < 10) {
      const hash = nanoid(8);
      const [existing] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.hash, hash))
        .limit(1);

      if (!existing) {
        return hash;
      }
      attempts++;
    }
    // Fallback with longer length if 8-char collisions happen
    return nanoid(10);
  }

  static async getProfiles(userId: string) {
    return db.query.profiles.findMany({
      where: eq(profiles.userId, userId),
      with: {
        contentDataset: true,
        theme: true,
        profileSections: true,
      },
      orderBy: [asc(profiles.createdAt)],
    });
  }

  static async getProfileById(id: string, userId?: string) {
    const conditions = [eq(profiles.id, id)];
    if (userId) {
      conditions.push(eq(profiles.userId, userId));
    }

    const result = await db.query.profiles.findFirst({
      where: and(...conditions),
      with: {
        contentDataset: {
          with: {
            sections: {
              with: {
                items: {
                  orderBy: [asc(sectionItems.displayOrder)],
                },
              },
              orderBy: [asc(sections.displayOrder)],
            },
          },
        },
        theme: true,
        profileSections: {
          orderBy: [asc(profileSections.displayOrder)],
        },
      },
    });

    return result || null;
  }

  static async setPrimaryProfile(id: string, userId: string): Promise<Profile | null> {
    return await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({ isDefault: false })
        .where(eq(profiles.userId, userId));

      const [updated] = await tx
        .update(profiles)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
        .returning();

      return updated || null;
    });
  }

  static async createProfile(userId: string, input: CreateProfileInput): Promise<Profile> {
    const hash = input.hash || (await this.generateUniqueHash());

    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(profiles)
          .set({ isDefault: false })
          .where(eq(profiles.userId, userId));
      }

      const [newProfile] = await tx
        .insert(profiles)
        .values({
          userId,
          name: input.name,
          description: input.description || null,
          hash,
          isDefault: input.isDefault ?? false,
          contentDatasetId: input.contentDatasetId || null,
          themeId: input.themeId || null,
        })
        .returning();

      // If a content dataset was provided, initialize default profile_sections
      if (input.contentDatasetId) {
        const datasetSections = await tx
          .select()
          .from(sections)
          .where(eq(sections.contentDatasetId, input.contentDatasetId))
          .orderBy(asc(sections.displayOrder));

        if (datasetSections.length > 0) {
          await tx.insert(profileSections).values(
            datasetSections.map((sec, idx) => ({
              profileId: newProfile.id,
              sectionId: sec.id,
              visible: !sec.hidden,
              selectedItemIds: [],
              displayOrder: idx,
            }))
          );
        }
      }

      return newProfile;
    });
  }

  static async updateProfile(
    id: string,
    userId: string,
    input: UpdateProfileInput
  ): Promise<Profile | null> {
    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(profiles)
          .set({ isDefault: false })
          .where(eq(profiles.userId, userId));
      }

      const [updated] = await tx
        .update(profiles)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
        .returning();

      return updated || null;
    });
  }

  static async deleteProfile(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .returning({ id: profiles.id });

    return !!deleted;
  }

  static async getProfileSections(profileId: string): Promise<ProfileSection[]> {
    return db
      .select()
      .from(profileSections)
      .where(eq(profileSections.profileId, profileId))
      .orderBy(asc(profileSections.displayOrder));
  }

  static async updateProfileSections(
    profileId: string,
    sectionsConfig: ProfileSectionItemConfig[]
  ): Promise<boolean> {
    await db.transaction(async (tx) => {
      // Delete existing configuration for this profile
      await tx.delete(profileSections).where(eq(profileSections.profileId, profileId));

      if (sectionsConfig.length > 0) {
        await tx.insert(profileSections).values(
          sectionsConfig.map((item, index) => ({
            profileId,
            sectionId: item.sectionId,
            visible: item.visible,
            selectedItemIds: item.selectedItemIds || [],
            displayOrder: item.displayOrder ?? index,
          }))
        );
      }
    });

    return true;
  }

  /**
   * Resolves a complete, production-ready profile object by hash.
   * Filters sections and individual items based on profile customization.
   */
  static async getResolvedProfile(hash?: string): Promise<ResolvedProfile | null> {
    try {
      let profileRecord = null;

      if (hash && hash !== 'default') {
        [profileRecord] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.hash, hash))
          .limit(1);
      }

      // Fallback to default profile if hash is 'default' or not matched
      if (!profileRecord) {
        [profileRecord] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.isDefault, true))
          .limit(1);
      }

      // If still no profile found, pick the earliest created profile
      if (!profileRecord) {
        [profileRecord] = await db
          .select()
          .from(profiles)
          .orderBy(asc(profiles.createdAt))
          .limit(1);
      }

      if (!profileRecord) {
        return null;
      }

      // Fetch theme
      let themeConfig: Record<string, unknown> = SYSTEM_DEFAULT_THEME_CONFIG as Record<string, unknown>;
      if (profileRecord.themeId) {
        const theme = await ThemeService.getThemeById(profileRecord.themeId);
        if (theme) {
          themeConfig = theme.config as Record<string, unknown>;
        }
      }

      // If no dataset linked, return basic profile container
      if (!profileRecord.contentDatasetId) {
        return {
          profile: {
            id: profileRecord.id,
            name: profileRecord.name,
            description: profileRecord.description,
            hash: profileRecord.hash,
            isDefault: profileRecord.isDefault,
          },
          basics: {},
          summary: '',
          picture: {},
          theme: themeConfig,
          sections: [],
        };
      }

      // Fetch content dataset
      const [dataset] = await db
        .select()
        .from(contentDatasets)
        .where(eq(contentDatasets.id, profileRecord.contentDatasetId))
        .limit(1);

      if (!dataset) {
        return null;
      }

      // Fetch all sections in this dataset
      const allSections = await db
        .select()
        .from(sections)
        .where(eq(sections.contentDatasetId, dataset.id))
        .orderBy(asc(sections.displayOrder));

      // Fetch profile_sections overrides
      const profileSectionConfigs = await db
        .select()
        .from(profileSections)
        .where(eq(profileSections.profileId, profileRecord.id));

      const configMap = new Map<string, ProfileSection>();
      profileSectionConfigs.forEach((cfg) => configMap.set(cfg.sectionId, cfg));

      // Fetch all section items for all sections in one query
      const sectionIds = allSections.map((s) => s.id);
      const allItems =
        sectionIds.length > 0
          ? await db
              .select()
              .from(sectionItems)
              .where(inArray(sectionItems.sectionId, sectionIds))
              .orderBy(asc(sectionItems.displayOrder))
          : [];

      const itemsBySection = new Map<string, typeof allItems>();
      allItems.forEach((item) => {
        const list = itemsBySection.get(item.sectionId) || [];
        list.push(item);
        itemsBySection.set(item.sectionId, list);
      });

      const resolvedSections: ResolvedProfileSection[] = [];

      for (const section of allSections) {
        const cfg = configMap.get(section.id);

        // Visibility check
        const isVisible = cfg ? cfg.visible : !section.hidden;
        if (!isVisible) continue;

        const order = cfg?.displayOrder ?? section.displayOrder;
        const rawItems = itemsBySection.get(section.id) || [];

        // Filter items
        const selectedIds = cfg?.selectedItemIds || [];
        const hasSpecificSelection = selectedIds.length > 0;

        const filteredItems: ResolvedProfileItem[] = rawItems
          .filter((item) => {
            if (item.hidden) return false;
            if (hasSpecificSelection) {
              return selectedIds.includes(item.id);
            }
            return true;
          })
          .map((item) => ({
            id: item.id,
            data: item.data as Record<string, unknown>,
            displayOrder: item.displayOrder,
          }));

        resolvedSections.push({
          id: section.id,
          type: section.type,
          title: section.title,
          icon: section.icon || '',
          columns: section.columns || 1,
          displayOrder: order,
          items: filteredItems,
        });
      }

      // Sort resolved sections by their profile display order
      resolvedSections.sort((a, b) => a.displayOrder - b.displayOrder);

      return {
        profile: {
          id: profileRecord.id,
          name: profileRecord.name,
          description: profileRecord.description,
          hash: profileRecord.hash,
          isDefault: profileRecord.isDefault,
        },
        basics: (dataset.basics as Record<string, unknown>) || {},
        summary: dataset.summary || '',
        picture: (dataset.picture as Record<string, unknown>) || {},
        theme: themeConfig,
        sections: resolvedSections,
      };
    } catch (error) {
      console.warn('Database offline or unreachable while resolving profile:', error);
      return null;
    }
  }
}
