'use client';

import React, { useState, useEffect } from 'react';
import styles from './metadata.module.css';

export interface ProjectSectionItem {
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

interface ProjectLinkerProps {
  selectedProjectItemId: string | null;
  onChange: (projectItemId: string | null) => void;
}

export const ProjectLinker: React.FC<ProjectLinkerProps> = ({
  selectedProjectItemId,
  onChange,
}) => {
  const [projects, setProjects] = useState<ProjectSectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/portfolio/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects || []);
        }
      } catch (err) {
        console.error('Failed to load project items:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  const linkedProject = projects.find((p) => p.id === selectedProjectItemId);

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.datasetName.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.metaControl}>
      <div className={styles.controlHeader}>
        <label className={styles.controlLabel}>
          <span>Linked Resume Project</span>
          <span className={styles.labelHint}>Directly connects this article to a project card</span>
        </label>
        {linkedProject && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={styles.changeProjectBtn}
          >
            Change Link
          </button>
        )}
      </div>

      {linkedProject ? (
        <div className={styles.linkedProjectCard}>
          <div className={styles.linkedProjectHeader}>
            <div className={styles.projectIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className={styles.projectInfo}>
              <h4 className={styles.projectName}>{linkedProject.name}</h4>
              <div className={styles.projectMeta}>
                <span className={styles.datasetTag}>{linkedProject.datasetName}</span>
                {linkedProject.period && (
                  <span className={styles.periodText}>{linkedProject.period}</span>
                )}
                {linkedProject.website && (
                  <a
                    href={linkedProject.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.projectWebLink}
                  >
                    ↗ Visit Site
                  </a>
                )}
              </div>
            </div>
          </div>

          {linkedProject.description && (
            <p className={styles.projectDescription}>{linkedProject.description}</p>
          )}

          <div className={styles.linkedCardActions}>
            <button
              type="button"
              onClick={() => onChange(null)}
              className={styles.unlinkBtn}
            >
              Unlink Project
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.unlinkedBox}>
          <div className={styles.unlinkedInfo}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>No resume project linked to this article.</span>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={styles.linkProjectBtn}
            disabled={loading || projects.length === 0}
          >
            {loading ? 'Loading Projects...' : projects.length === 0 ? 'No Projects in Resume' : '+ Link to Resume Project'}
          </button>
        </div>
      )}

      {/* Project Selection Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Link Article to Resume Project</h3>
                <p className={styles.modalSubtitle}>
                  Select a project from your resume datasets to showcase this article as a technical case study.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={styles.closeModalBtn}
              >
                ×
              </button>
            </div>

            {/* Search filter */}
            <div className={styles.modalSearch}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by title, dataset or description..."
                className={styles.inputField}
                autoFocus
              />
            </div>

            {/* Projects List */}
            <div className={styles.modalProjectsList}>
              {filteredProjects.length === 0 ? (
                <div className={styles.emptySearch}>
                  <p>No matching resume projects found.</p>
                </div>
              ) : (
                filteredProjects.map((p) => {
                  const isSelected = p.id === selectedProjectItemId;
                  return (
                    <div
                      key={p.id}
                      className={`${styles.projectSelectCard} ${isSelected ? styles.projectSelected : ''}`}
                      onClick={() => {
                        onChange(p.id);
                        setModalOpen(false);
                      }}
                    >
                      <div className={styles.projectSelectHeader}>
                        <h4 className={styles.projectName}>{p.name}</h4>
                        {isSelected && <span className={styles.selectedPill}>Currently Linked</span>}
                      </div>
                      <div className={styles.projectMeta}>
                        <span className={styles.datasetTag}>{p.datasetName}</span>
                        {p.period && <span className={styles.periodText}>{p.period}</span>}
                      </div>
                      {p.description && (
                        <p className={styles.projectDescriptionModal}>{p.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
