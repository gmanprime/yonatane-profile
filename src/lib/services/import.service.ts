import { db } from '@/lib/db';
import { contentDatasets, sections, sectionItems } from '@/lib/db/schema';
import type { RxResumeData, JsonResumeData } from '@/lib/validators/rxresume.validator';

export interface ParsedSection {
  type: string;
  title: string;
  icon: string;
  columns: number;
  hidden: boolean;
  displayOrder: number;
  items: Array<{
    data: Record<string, any>;
    hidden: boolean;
    displayOrder: number;
  }>;
}

export interface ParsedResumeResult {
  basics: Record<string, any>;
  summary: string;
  picture: Record<string, any>;
  sections: ParsedSection[];
  rawJson: any;
}

export class ImportService {
  /**
   * Parses standard RxResume JSON format (Reactive Resume v4/v5).
   */
  static parseRxResume(data: RxResumeData): ParsedResumeResult {
    const basics = data.basics || {};
    const summary = data.summary?.content || '';
    const picture = data.picture || {};
    const parsedSections: ParsedSection[] = [];

    const sectionDict = data.sections || {};
    const sectionKeys = Object.keys(sectionDict);

    sectionKeys.forEach((key, index) => {
      const section = sectionDict[key];
      if (!section) return;

      const items = (section.items || []).map((item, itemIdx) => ({
        data: item,
        hidden: item.hidden ?? false,
        displayOrder: itemIdx,
      }));

      parsedSections.push({
        type: key,
        title: section.title || key.charAt(0).toUpperCase() + key.slice(1),
        icon: section.icon || '',
        columns: section.columns ?? 1,
        hidden: section.hidden ?? false,
        displayOrder: index,
        items,
      });
    });

    return {
      basics,
      summary,
      picture,
      sections: parsedSections,
      rawJson: data,
    };
  }

  /**
   * Parses JSON Resume standard format.
   */
  static parseJsonResume(data: JsonResumeData): ParsedResumeResult {
    const b = data.basics || {};
    const basics: Record<string, any> = {
      name: b.name || '',
      headline: b.label || '',
      email: b.email || '',
      phone: b.phone || '',
      location: typeof b.location === 'object' ? `${b.location.city || ''}, ${b.location.countryCode || ''}` : b.location || '',
      website: typeof b.url === 'string' ? { url: b.url, label: 'Website' } : b.url || '',
      customFields: [],
    };

    const picture = {
      hidden: !b.image,
      url: b.image || '',
    };

    const summary = b.summary || '';
    const parsedSections: ParsedSection[] = [];
    let order = 0;

    // Profiles
    if (b.profiles && Array.isArray(b.profiles) && b.profiles.length > 0) {
      parsedSections.push({
        type: 'profiles',
        title: 'Profiles',
        icon: 'share-2',
        columns: 2,
        hidden: false,
        displayOrder: order++,
        items: b.profiles.map((p, idx) => ({
          data: {
            network: p.network || '',
            username: p.username || '',
            website: { url: p.url || '', label: p.network || '' },
          },
          hidden: false,
          displayOrder: idx,
        })),
      });
    }

    // Work / Experience
    if (data.work && Array.isArray(data.work) && data.work.length > 0) {
      parsedSections.push({
        type: 'experience',
        title: 'Experience',
        icon: 'briefcase',
        columns: 1,
        hidden: false,
        displayOrder: order++,
        items: data.work.map((w, idx) => ({
          data: {
            company: w.name || w.company || '',
            position: w.position || '',
            location: w.location || '',
            period: `${w.startDate || ''} - ${w.endDate || (w.isCurrentRole ? 'Present' : '')}`,
            website: { url: w.url || '', label: w.name || '' },
            description: w.summary || (Array.isArray(w.highlights) ? `<ul>${w.highlights.map((h: string) => `<li>${h}</li>`).join('')}</ul>` : ''),
            roles: [],
          },
          hidden: false,
          displayOrder: idx,
        })),
      });
    }

    // Education
    if (data.education && Array.isArray(data.education) && data.education.length > 0) {
      parsedSections.push({
        type: 'education',
        title: 'Education',
        icon: 'graduation-cap',
        columns: 1,
        hidden: false,
        displayOrder: order++,
        items: data.education.map((e, idx) => ({
          data: {
            school: e.institution || '',
            degree: e.studyType || '',
            area: e.area || '',
            grade: e.score || '',
            location: e.location || '',
            period: `${e.startDate || ''} - ${e.endDate || ''}`,
            website: { url: e.url || '', label: e.institution || '' },
            description: Array.isArray(e.courses) ? `<p>Courses: ${e.courses.join(', ')}</p>` : '',
          },
          hidden: false,
          displayOrder: idx,
        })),
      });
    }

    // Projects
    if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
      parsedSections.push({
        type: 'projects',
        title: 'Projects',
        icon: 'folder-git-2',
        columns: 1,
        hidden: false,
        displayOrder: order++,
        items: data.projects.map((p, idx) => ({
          data: {
            name: p.name || '',
            period: `${p.startDate || ''} - ${p.endDate || ''}`,
            website: { url: p.url || '', label: p.name || '' },
            description: p.description || (Array.isArray(p.highlights) ? `<ul>${p.highlights.map((h: string) => `<li>${h}</li>`).join('')}</ul>` : ''),
          },
          hidden: false,
          displayOrder: idx,
        })),
      });
    }

    // Skills
    if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
      parsedSections.push({
        type: 'skills',
        title: 'Skills',
        icon: 'code-2',
        columns: 1,
        hidden: false,
        displayOrder: order++,
        items: data.skills.map((s, idx) => ({
          data: {
            name: s.name || '',
            proficiency: s.level || '',
            level: 4,
            keywords: Array.isArray(s.keywords) ? s.keywords : [],
          },
          hidden: false,
          displayOrder: idx,
        })),
      });
    }

    // Languages
    if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
      parsedSections.push({
        type: 'languages',
        title: 'Languages',
        icon: 'languages',
        columns: 2,
        hidden: false,
        displayOrder: order++,
        items: data.languages.map((l, idx) => ({
          data: {
            language: l.language || '',
            fluency: l.fluency || '',
          },
          hidden: false,
          displayOrder: idx,
        })),
      });
    }

    return {
      basics,
      summary,
      picture,
      sections: parsedSections,
      rawJson: data,
    };
  }

  /**
   * Automatically detects format (RxResume or JSON Resume) and parses.
   */
  static parse(rawData: any, type: 'rxresume' | 'jsonresume' | 'auto' = 'auto'): ParsedResumeResult {
    if (type === 'rxresume' || (type === 'auto' && rawData.sections && typeof rawData.sections === 'object' && !Array.isArray(rawData.sections))) {
      return this.parseRxResume(rawData);
    }
    return this.parseJsonResume(rawData);
  }

  /**
   * Imports a parsed resume into the PostgreSQL database under a given User.
   */
  static async importResumeToDatabase(userId: string, datasetName: string, rawData: any, type: 'rxresume' | 'jsonresume' | 'auto' = 'auto') {
    const parsed = this.parse(rawData, type);

    return await db.transaction(async (tx) => {
      const [dataset] = await tx
        .insert(contentDatasets)
        .values({
          userId,
          name: datasetName,
          rawJson: parsed.rawJson,
          basics: parsed.basics,
          summary: parsed.summary,
          picture: parsed.picture,
        })
        .returning();

      for (const section of parsed.sections) {
        const [createdSection] = await tx
          .insert(sections)
          .values({
            contentDatasetId: dataset.id,
            type: section.type,
            title: section.title,
            icon: section.icon,
            columns: section.columns,
            hidden: section.hidden,
            displayOrder: section.displayOrder,
          })
          .returning();

        if (section.items && section.items.length > 0) {
          const itemsToInsert = section.items.map((item) => ({
            sectionId: createdSection.id,
            data: item.data,
            hidden: item.hidden,
            displayOrder: item.displayOrder,
          }));

          await tx.insert(sectionItems).values(itemsToInsert);
        }
      }

      return dataset;
    });
  }
}
