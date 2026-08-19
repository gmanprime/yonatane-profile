import { db } from '@/lib/db';
import { profileAnalytics, profiles, type ProfileAnalytic } from '@/lib/db/schema';
import {
  type AnalyticsQueryInput,
  type TelemetryRecordInput,
} from '@/lib/validators/analytics.validator';
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

export interface AnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  devices: { deviceType: string; count: number }[];
  browsers: { browser: string; count: number }[];
  operatingSystems: { os: string; count: number }[];
  countries: { country: string; count: number }[];
  referrers: { referrer: string; count: number }[];
  timeline: { date: string; count: number }[];
  recentVisits: ProfileAnalytic[];
}

export class AnalyticsService {
  /**
   * Lightweight user agent parser to extract device type, browser, and OS without external bloated dependencies.
   */
  static parseUserAgent(ua = '') {
    let deviceType = 'desktop';
    let browser = 'Other';
    let os = 'Other';

    const lowerUA = ua.toLowerCase();

    // Device Type
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = 'tablet';
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      deviceType = 'mobile';
    }

    // OS (Check iOS/iPhone/iPad before generic macOS 'like Mac OS X')
    if (lowerUA.includes('iphone') || lowerUA.includes('ipad') || lowerUA.includes('ipod') || lowerUA.includes('ios')) os = 'iOS';
    else if (lowerUA.includes('android')) os = 'Android';
    else if (lowerUA.includes('win')) os = 'Windows';
    else if (lowerUA.includes('mac')) os = 'macOS';
    else if (lowerUA.includes('linux') || lowerUA.includes('cros') || lowerUA.includes('x11')) os = 'Linux';

    // Browser
    if (lowerUA.includes('edg/')) browser = 'Edge';
    else if (lowerUA.includes('chrome') && !lowerUA.includes('chromium')) browser = 'Chrome';
    else if (lowerUA.includes('safari') && !lowerUA.includes('chrome')) browser = 'Safari';
    else if (lowerUA.includes('firefox')) browser = 'Firefox';
    else if (lowerUA.includes('opr') || lowerUA.includes('opera')) browser = 'Opera';

    return { deviceType, browser, os };
  }

  /**
   * Records a visit telemetry entry.
   */
  static async logVisit(profileId: string, input: TelemetryRecordInput): Promise<ProfileAnalytic> {
    const { deviceType, browser, os } = this.parseUserAgent(input.userAgent || '');

    const [record] = await db
      .insert(profileAnalytics)
      .values({
        profileId,
        ipAddress: input.ipAddress || null,
        country: input.country || null,
        city: input.city || null,
        region: input.region || null,
        userAgent: input.userAgent || null,
        deviceType: input.deviceType || deviceType,
        browser: input.browser || browser,
        os: input.os || os,
        referrer: input.referrer || null,
        screenWidth: input.screenWidth || null,
        screenHeight: input.screenHeight || null,
        visitedAt: new Date(),
      })
      .returning();

    return record;
  }

  /**
   * Aggregates telemetry stats for a profile.
   */
  static async getProfileAnalytics(
    profileId: string,
    userId?: string,
    options: AnalyticsQueryInput = {}
  ): Promise<AnalyticsSummary> {
    if (userId) {
      const [userProfile] = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
        .limit(1);

      if (!userProfile) {
        throw new Error('Profile not found or access denied');
      }
    }

    const conditions = [eq(profileAnalytics.profileId, profileId)];

    if (options.startDate) {
      conditions.push(gte(profileAnalytics.visitedAt, new Date(options.startDate)));
    }
    if (options.endDate) {
      conditions.push(lte(profileAnalytics.visitedAt, new Date(options.endDate)));
    }

    const whereClause = and(...conditions);

    // Total visits
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileAnalytics)
      .where(whereClause);

    const totalVisits = totalResult?.count || 0;

    // Unique visitors (by IP)
    const [uniqueResult] = await db
      .select({ count: sql<number>`count(distinct ${profileAnalytics.ipAddress})::int` })
      .from(profileAnalytics)
      .where(whereClause);

    const uniqueVisitors = uniqueResult?.count || 0;

    // Devices
    const devices = await db
      .select({
        deviceType: sql<string>`coalesce(${profileAnalytics.deviceType}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.deviceType)
      .orderBy(desc(sql`count(*)`));

    // Browsers
    const browsers = await db
      .select({
        browser: sql<string>`coalesce(${profileAnalytics.browser}, 'Other')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.browser)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // OS
    const operatingSystems = await db
      .select({
        os: sql<string>`coalesce(${profileAnalytics.os}, 'Other')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.os)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Countries
    const countries = await db
      .select({
        country: sql<string>`coalesce(${profileAnalytics.country}, 'Unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.country)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Referrers
    const referrers = await db
      .select({
        referrer: sql<string>`coalesce(${profileAnalytics.referrer}, 'Direct')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Timeline (by date)
    const timeline = await db
      .select({
        date: sql<string>`to_char(${profileAnalytics.visitedAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(sql`to_char(${profileAnalytics.visitedAt}, 'YYYY-MM-DD')`)
      .orderBy(asc(sql`to_char(${profileAnalytics.visitedAt}, 'YYYY-MM-DD')`));

    // Recent visits
    const recentVisits = await db
      .select()
      .from(profileAnalytics)
      .where(whereClause)
      .orderBy(desc(profileAnalytics.visitedAt))
      .limit(typeof options.limit === 'number' ? options.limit : 50)
      .offset(typeof options.offset === 'number' ? options.offset : 0);

    return {
      totalVisits,
      uniqueVisitors,
      devices,
      browsers,
      operatingSystems,
      countries,
      referrers,
      timeline,
      recentVisits,
    };
  }

  /**
   * Aggregates comprehensive telemetry statistics for the Admin Analytics Dashboard.
   * Supports filtering by profileId, date range, and search keyword.
   */
  static async getDashboardAnalytics(params: {
    userId: string;
    profileId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { userId, profileId, startDate, endDate, search, limit = 100, offset = 0 } = params;

    // Fetch user's profiles for security and dropdown options
    const userProfiles = await db
      .select({ id: profiles.id, name: profiles.name, hash: profiles.hash, isDefault: profiles.isDefault })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .orderBy(asc(profiles.name));

    const userProfileIds = userProfiles.map((p) => p.id);

    if (userProfileIds.length === 0) {
      return {
        totalVisits: 0,
        uniqueVisitors: 0,
        devices: [],
        browsers: [],
        operatingSystems: [],
        countries: [],
        referrers: [],
        timeline: [],
        recentVisits: [],
        profiles: [],
      };
    }

    // Determine target profile IDs
    const targetProfileIds = profileId && userProfileIds.includes(profileId)
      ? [profileId]
      : userProfileIds;

    const conditions = [inArray(profileAnalytics.profileId, targetProfileIds)];

    if (startDate) {
      conditions.push(gte(profileAnalytics.visitedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(profileAnalytics.visitedAt, new Date(endDate)));
    }
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        sql`(
          lower(${profileAnalytics.ipAddress}) LIKE ${q} OR
          lower(${profileAnalytics.country}) LIKE ${q} OR
          lower(${profileAnalytics.city}) LIKE ${q} OR
          lower(${profileAnalytics.region}) LIKE ${q} OR
          lower(${profileAnalytics.browser}) LIKE ${q} OR
          lower(${profileAnalytics.os}) LIKE ${q} OR
          lower(${profileAnalytics.referrer}) LIKE ${q} OR
          lower(${profileAnalytics.userAgent}) LIKE ${q}
        )`
      );
    }

    const whereClause = and(...conditions);

    // Total visits count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileAnalytics)
      .where(whereClause);

    const totalVisits = totalResult?.count || 0;

    // Unique visitors count (by distinct IP)
    const [uniqueResult] = await db
      .select({ count: sql<number>`count(distinct ${profileAnalytics.ipAddress})::int` })
      .from(profileAnalytics)
      .where(whereClause);

    const uniqueVisitors = uniqueResult?.count || 0;

    // Device breakdown
    const devices = await db
      .select({
        deviceType: sql<string>`coalesce(${profileAnalytics.deviceType}, 'desktop')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.deviceType)
      .orderBy(desc(sql`count(*)`));

    // Browsers breakdown
    const browsers = await db
      .select({
        browser: sql<string>`coalesce(${profileAnalytics.browser}, 'Other')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.browser)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Operating Systems breakdown
    const operatingSystems = await db
      .select({
        os: sql<string>`coalesce(${profileAnalytics.os}, 'Other')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.os)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Geographic Countries breakdown
    const countries = await db
      .select({
        country: sql<string>`coalesce(${profileAnalytics.country}, 'Unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.country)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    // Top Referrers
    const referrers = await db
      .select({
        referrer: sql<string>`coalesce(${profileAnalytics.referrer}, 'Direct / Bookmark')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(profileAnalytics.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Timeline trend (by date)
    const timeline = await db
      .select({
        date: sql<string>`to_char(${profileAnalytics.visitedAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profileAnalytics)
      .where(whereClause)
      .groupBy(sql`to_char(${profileAnalytics.visitedAt}, 'YYYY-MM-DD')`)
      .orderBy(asc(sql`to_char(${profileAnalytics.visitedAt}, 'YYYY-MM-DD')`));

    // Access logs list (paginated)
    const recentVisits = await db
      .select({
        id: profileAnalytics.id,
        profileId: profileAnalytics.profileId,
        ipAddress: profileAnalytics.ipAddress,
        country: profileAnalytics.country,
        city: profileAnalytics.city,
        region: profileAnalytics.region,
        deviceType: profileAnalytics.deviceType,
        browser: profileAnalytics.browser,
        os: profileAnalytics.os,
        referrer: profileAnalytics.referrer,
        screenWidth: profileAnalytics.screenWidth,
        screenHeight: profileAnalytics.screenHeight,
        userAgent: profileAnalytics.userAgent,
        visitedAt: profileAnalytics.visitedAt,
        profileName: profiles.name,
        profileHash: profiles.hash,
      })
      .from(profileAnalytics)
      .leftJoin(profiles, eq(profileAnalytics.profileId, profiles.id))
      .where(whereClause)
      .orderBy(desc(profileAnalytics.visitedAt))
      .limit(limit)
      .offset(offset);

    return {
      totalVisits,
      uniqueVisitors,
      devices,
      browsers,
      operatingSystems,
      countries,
      referrers,
      timeline,
      recentVisits,
      profiles: userProfiles,
    };
  }

  /**
   * Aggregates high-level telemetry stats across all user profiles for the Admin Dashboard.
   */
  static async getOverallAnalytics(userId?: string) {
    if (!userId) {
      return { totalVisits: 0, uniqueVisitors: 0, recentVisits: [] };
    }
    const dashboard = await this.getDashboardAnalytics({ userId, limit: 10 });
    return {
      totalVisits: dashboard.totalVisits,
      uniqueVisitors: dashboard.uniqueVisitors,
      recentVisits: dashboard.recentVisits,
    };
  }

  /**
   * Generates standard RFC 4180 CSV export of analytics logs.
   */
  static async exportAnalyticsCSV(params: {
    userId: string;
    profileId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<string> {
    const { userId, profileId, startDate, endDate, search } = params;

    const userProfiles = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId));

    const userProfileIds = userProfiles.map((p) => p.id);
    if (userProfileIds.length === 0) {
      return 'ID,Visited At,Profile Name,Profile Hash,IP Address,Country,City,Region,Device Type,Browser,OS,Referrer,Screen Width,Screen Height,User Agent\r\n';
    }

    const targetProfileIds = profileId && userProfileIds.includes(profileId)
      ? [profileId]
      : userProfileIds;

    const conditions = [inArray(profileAnalytics.profileId, targetProfileIds)];

    if (startDate) {
      conditions.push(gte(profileAnalytics.visitedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(profileAnalytics.visitedAt, new Date(endDate)));
    }
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        sql`(
          lower(${profileAnalytics.ipAddress}) LIKE ${q} OR
          lower(${profileAnalytics.country}) LIKE ${q} OR
          lower(${profileAnalytics.city}) LIKE ${q} OR
          lower(${profileAnalytics.region}) LIKE ${q} OR
          lower(${profileAnalytics.browser}) LIKE ${q} OR
          lower(${profileAnalytics.os}) LIKE ${q} OR
          lower(${profileAnalytics.referrer}) LIKE ${q} OR
          lower(${profileAnalytics.userAgent}) LIKE ${q}
        )`
      );
    }

    const rows = await db
      .select({
        id: profileAnalytics.id,
        visitedAt: profileAnalytics.visitedAt,
        ipAddress: profileAnalytics.ipAddress,
        country: profileAnalytics.country,
        city: profileAnalytics.city,
        region: profileAnalytics.region,
        deviceType: profileAnalytics.deviceType,
        browser: profileAnalytics.browser,
        os: profileAnalytics.os,
        referrer: profileAnalytics.referrer,
        screenWidth: profileAnalytics.screenWidth,
        screenHeight: profileAnalytics.screenHeight,
        userAgent: profileAnalytics.userAgent,
        profileName: profiles.name,
        profileHash: profiles.hash,
      })
      .from(profileAnalytics)
      .leftJoin(profiles, eq(profileAnalytics.profileId, profiles.id))
      .where(and(...conditions))
      .orderBy(desc(profileAnalytics.visitedAt));

    const headers = [
      'ID',
      'Visited At',
      'Profile Name',
      'Profile Hash',
      'IP Address',
      'Country',
      'City',
      'Region',
      'Device Type',
      'Browser',
      'OS',
      'Referrer',
      'Screen Width',
      'Screen Height',
      'User Agent',
    ];

    const escapeCSV = (val: unknown) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [headers.join(',')];

    for (const row of rows) {
      csvLines.push(
        [
          row.id,
          row.visitedAt.toISOString(),
          escapeCSV(row.profileName || ''),
          escapeCSV(row.profileHash || ''),
          escapeCSV(row.ipAddress),
          escapeCSV(row.country),
          escapeCSV(row.city),
          escapeCSV(row.region),
          escapeCSV(row.deviceType),
          escapeCSV(row.browser),
          escapeCSV(row.os),
          escapeCSV(row.referrer),
          row.screenWidth ?? '',
          row.screenHeight ?? '',
          escapeCSV(row.userAgent),
        ].join(',')
      );
    }

    return csvLines.join('\r\n');
  }
}
