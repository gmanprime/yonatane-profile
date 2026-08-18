import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  serial,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// USERS (linked to Supabase Auth)
// ============================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  supabaseAuthId: text('supabase_auth_id').notNull().unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// CONTENT DATASETS
// A named collection of resume data (one per import or manual creation)
// ============================================================
export const contentDatasets = pgTable('content_datasets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // Store the full raw RxResume JSON for reference/re-import
  rawJson: jsonb('raw_json'),
  // Basics info stored as JSONB (name, headline, email, phone, location, website, customFields)
  basics: jsonb('basics'),
  // Summary HTML content
  summary: text('summary'),
  // Picture configuration as JSONB
  picture: jsonb('picture'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// SECTIONS
// A section within a content dataset (experience, education, skills, etc.)
// ============================================================
export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentDatasetId: uuid('content_dataset_id').notNull().references(() => contentDatasets.id, { onDelete: 'cascade' }),
  // Section type: 'experience' | 'education' | 'skills' | 'projects' | 'languages' | 'certifications' | 'awards' | 'volunteer' | 'references' | 'publications' | 'interests' | 'profiles' | 'custom'
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 100 }).default(''),
  columns: integer('columns').default(1),
  hidden: boolean('hidden').default(false).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('sections_dataset_idx').on(table.contentDatasetId)]);

// ============================================================
// SECTION ITEMS
// Individual items within a section (each job, school, skill, etc.)
// ============================================================
export const sectionItems = pgTable('section_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  // JSONB data varies by section type:
  // experience: { company, position, location, period, website, description, roles[] }
  // education: { school, degree, area, grade, location, period, website, description }
  // skills: { name, proficiency, level, keywords[], icon, iconColor }
  // projects: { name, period, website, description }
  // languages: { language, fluency, level }
  // certifications: { title, issuer, date, website, description }
  // awards: { title, awarder, date, website, description }
  // volunteer: { organization, location, period, website, description }
  // profiles: { network, username, website, icon, iconColor }
  // interests: { name, keywords[], icon, iconColor }
  // publications: { title, publisher, date, website, description }
  // references: { name, position, phone, website, description }
  data: jsonb('data').notNull(),
  hidden: boolean('hidden').default(false).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('items_section_idx').on(table.sectionId)]);

// ============================================================
// THEMES
// Theme configuration (single default for now, multi-theme ready)
// ============================================================
export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  // JSONB config storing:
  // {
  //   colors: { primary, secondary, background, surface, text, accent, muted },
  //   typography: { headingFont, bodyFont, baseFontSize, scaleRatio },
  //   layout: { sectionOrder: string[], containerStyles: Record<string, object> },
  //   spacing: { sectionGap, itemGap, contentMaxWidth }
  // }
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// PROFILES
// A named profile configuration with stealth routing hash
// ============================================================
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // 8-char opaque hash for stealth routing (/p/[hash])
  hash: varchar('hash', { length: 16 }).notNull().unique(),
  isDefault: boolean('is_default').default(false).notNull(),
  contentDatasetId: uuid('content_dataset_id').references(() => contentDatasets.id, { onDelete: 'set null' }),
  themeId: uuid('theme_id').references(() => themes.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('profiles_hash_idx').on(table.hash),
]);

// ============================================================
// PROFILE SECTIONS
// Junction: which sections and which items are visible in a profile
// ============================================================
export const profileSections = pgTable('profile_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  sectionId: uuid('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  visible: boolean('visible').default(true).notNull(),
  // Array of section_item IDs that are selected for display in this profile.
  // If null/empty, ALL items in the section are displayed.
  selectedItemIds: jsonb('selected_item_ids').$type<string[]>(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('profile_sections_profile_idx').on(table.profileId)]);

// ============================================================
// PORTFOLIO ITEMS
// Extended blog content for project/portfolio entries
// ============================================================
export const portfolioItems = pgTable('portfolio_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Optional link to a project section_item
  projectItemId: uuid('project_item_id').references(() => sectionItems.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 500 }).notNull(),
  subtitle: varchar('subtitle', { length: 500 }),
  coverImageUrl: text('cover_image_url'),
  // Markdown body content
  markdownBody: text('markdown_body'),
  // Tags as JSON array of strings
  tags: jsonb('tags').$type<string[]>().default([]),
  // External links as JSON array: [{ label: string, url: string }]
  links: jsonb('links').$type<{ label: string; url: string }[]>().default([]),
  // 'draft' | 'published'
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// PROFILE ANALYTICS
// Visitor tracking for stealth profile links
// ============================================================
export const profileAnalytics = pgTable('profile_analytics', {
  id: serial('id').primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 45 }),
  country: varchar('country', { length: 100 }),
  city: varchar('city', { length: 100 }),
  region: varchar('region', { length: 100 }),
  userAgent: text('user_agent'),
  deviceType: varchar('device_type', { length: 20 }), // mobile | desktop | tablet
  browser: varchar('browser', { length: 100 }),
  os: varchar('os', { length: 100 }),
  referrer: text('referrer'),
  screenWidth: integer('screen_width'),
  screenHeight: integer('screen_height'),
  visitedAt: timestamp('visited_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('analytics_profile_idx').on(table.profileId),
  index('analytics_visited_at_idx').on(table.visitedAt),
]);

// ============================================================
// RELATIONS
// ============================================================
export const usersRelations = relations(users, ({ many }) => ({
  contentDatasets: many(contentDatasets),
  profiles: many(profiles),
  themes: many(themes),
  portfolioItems: many(portfolioItems),
}));

export const contentDatasetsRelations = relations(contentDatasets, ({ one, many }) => ({
  user: one(users, { fields: [contentDatasets.userId], references: [users.id] }),
  sections: many(sections),
  profiles: many(profiles),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  contentDataset: one(contentDatasets, { fields: [sections.contentDatasetId], references: [contentDatasets.id] }),
  items: many(sectionItems),
  profileSections: many(profileSections),
}));

export const sectionItemsRelations = relations(sectionItems, ({ one }) => ({
  section: one(sections, { fields: [sectionItems.sectionId], references: [sections.id] }),
}));

export const themesRelations = relations(themes, ({ one, many }) => ({
  user: one(users, { fields: [themes.userId], references: [users.id] }),
  profiles: many(profiles),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  contentDataset: one(contentDatasets, { fields: [profiles.contentDatasetId], references: [contentDatasets.id] }),
  theme: one(themes, { fields: [profiles.themeId], references: [themes.id] }),
  profileSections: many(profileSections),
  analytics: many(profileAnalytics),
}));

export const profileSectionsRelations = relations(profileSections, ({ one }) => ({
  profile: one(profiles, { fields: [profileSections.profileId], references: [profiles.id] }),
  section: one(sections, { fields: [profileSections.sectionId], references: [sections.id] }),
}));

export const portfolioItemsRelations = relations(portfolioItems, ({ one }) => ({
  user: one(users, { fields: [portfolioItems.userId], references: [users.id] }),
  projectItem: one(sectionItems, { fields: [portfolioItems.projectItemId], references: [sectionItems.id] }),
}));

export const profileAnalyticsRelations = relations(profileAnalytics, ({ one }) => ({
  profile: one(profiles, { fields: [profileAnalytics.profileId], references: [profiles.id] }),
}));

// ============================================================
// TYPE EXPORTS
// ============================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ContentDataset = typeof contentDatasets.$inferSelect;
export type NewContentDataset = typeof contentDatasets.$inferInsert;

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;

export type SectionItem = typeof sectionItems.$inferSelect;
export type NewSectionItem = typeof sectionItems.$inferInsert;

export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type ProfileSection = typeof profileSections.$inferSelect;
export type NewProfileSection = typeof profileSections.$inferInsert;

export type PortfolioItem = typeof portfolioItems.$inferSelect;
export type NewPortfolioItem = typeof portfolioItems.$inferInsert;

export type ProfileAnalytic = typeof profileAnalytics.$inferSelect;
export type NewProfileAnalytic = typeof profileAnalytics.$inferInsert;
