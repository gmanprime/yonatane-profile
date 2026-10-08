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
// PROJECT ↔ ARTICLE LINKS (Junction Table)
// Many-to-many forward-linking between section_items and portfolio_items
// ============================================================
export const projectArticleLinks = pgTable('project_article_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionItemId: uuid('section_item_id').notNull().references(() => sectionItems.id, { onDelete: 'cascade' }),
  portfolioItemId: uuid('portfolio_item_id').notNull().references(() => portfolioItems.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('pal_unique_link_idx').on(table.sectionItemId, table.portfolioItemId),
  index('pal_section_item_idx').on(table.sectionItemId),
  index('pal_portfolio_item_idx').on(table.portfolioItemId),
]);

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
  passkeys: many(passkeys),
  invitesCreated: many(userInvites),
  securityEvents: many(securityEvents),
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

export const sectionItemsRelations = relations(sectionItems, ({ one, many }) => ({
  section: one(sections, { fields: [sectionItems.sectionId], references: [sections.id] }),
  articleLinks: many(projectArticleLinks),
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

export const portfolioItemsRelations = relations(portfolioItems, ({ one, many }) => ({
  user: one(users, { fields: [portfolioItems.userId], references: [users.id] }),
  projectItem: one(sectionItems, { fields: [portfolioItems.projectItemId], references: [sectionItems.id] }),
  articleLinks: many(projectArticleLinks),
}));

export const projectArticleLinksRelations = relations(projectArticleLinks, ({ one }) => ({
  sectionItem: one(sectionItems, { fields: [projectArticleLinks.sectionItemId], references: [sectionItems.id] }),
  portfolioItem: one(portfolioItems, { fields: [projectArticleLinks.portfolioItemId], references: [portfolioItems.id] }),
}));

export const profileAnalyticsRelations = relations(profileAnalytics, ({ one }) => ({
  profile: one(profiles, { fields: [profileAnalytics.profileId], references: [profiles.id] }),
}));

// ============================================================
// APP SETTINGS & MASTER KEYSTORE
// Secure database storage for integration keys & configuration
// ============================================================
export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
  isSecret: boolean('is_secret').default(false).notNull(),
  category: varchar('category', { length: 50 }).default('general').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// USER INVITES (Admin-gated signup tokens)
// ============================================================
export const userInvites = pgTable('user_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  role: varchar('role', { length: 50 }).default('admin').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('invites_token_idx').on(table.token),
  index('invites_email_idx').on(table.email),
]);

// ============================================================
// PASSKEYS (WebAuthn credential storage)
// ============================================================
export const passkeys = pgTable('passkeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').default(0).notNull(),
  transports: text('transports'), // JSON array of transport strings
  deviceName: varchar('device_name', { length: 255 }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('passkeys_user_idx').on(table.userId),
  index('passkeys_credential_idx').on(table.credentialId),
]);

// ============================================================
// SECURITY AUDIT LOG
// ============================================================
export const securityEvents = pgTable('security_events', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // login, logout, password_change, invite_created, totp_bypass, passkey_registered, etc.
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata'), // Additional context (e.g., invite token, device info)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('security_events_user_idx').on(table.userId),
  index('security_events_type_idx').on(table.eventType),
  index('security_events_created_idx').on(table.createdAt),
]);

export const userInvitesRelations = relations(userInvites, ({ one }) => ({
  createdBy: one(users, { fields: [userInvites.createdById], references: [users.id] }),
}));

export const passkeysRelations = relations(passkeys, ({ one }) => ({
  user: one(users, { fields: [passkeys.userId], references: [users.id] }),
}));

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(users, { fields: [securityEvents.userId], references: [users.id] }),
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

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

export type ProjectArticleLink = typeof projectArticleLinks.$inferSelect;
export type NewProjectArticleLink = typeof projectArticleLinks.$inferInsert;

export type UserInvite = typeof userInvites.$inferSelect;
export type NewUserInvite = typeof userInvites.$inferInsert;

export type Passkey = typeof passkeys.$inferSelect;
export type NewPasskey = typeof passkeys.$inferInsert;

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type NewSecurityEvent = typeof securityEvents.$inferInsert;
