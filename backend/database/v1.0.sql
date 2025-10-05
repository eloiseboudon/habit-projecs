-- init_seed_habit.sql
-- Insère les données de démarrage dans le schéma habit

SET search_path TO habit, public;

-- DOMAINS
INSERT INTO domains (id, key, name, icon, order_index) VALUES
  (1, 'health',    'Santé & Sport',        '💪', 1),
  (2, 'work',      'Travail & Projets',    '💼', 2),
  (3, 'money',     'Finances',             '💰', 3),
  (4, 'mindset',   'Esprit & Connaissance','🧠', 4),
  (5, 'relations', 'Relations & Social',   '🤝', 5),
  (6, 'home',      'Maison & Vie perso',   '🏡', 6)
ON CONFLICT (id) DO NOTHING;


-- TASK TEMPLATES
-- (corrigé : virgule manquante après la 2e ligne + unités cohérentes)
INSERT INTO task_templates (id, title, domain_id, default_xp, default_points, unit, is_active) VALUES
  (1,  'Séance de sport (45 min)',             1, 10, 10, 'min', true),
  (2,  'Boire 2L d’eau',                       1, 5,  5,  'L',   true),
  (3,  'Avancer un projet pro',                2, 10, 10, NULL,  true),
  (4,  'Apprendre une nouvelle compétence',    2, 15, 15, NULL,  true),
  (5,  'Épargner 20 €',                        3, 10, 10, '€',   true),
  (6,  'Suivi budget perso',                   3, 5,  5,  NULL,  true),
  (7,  'Lecture 30 min',                       4, 10, 10, 'min', true),
  (8,  'Méditation 10 min',                    4, 5,  5,  'min', true),
  (9,  'Appeler un ami',                       5, 10, 10, NULL,  true),
  (10, 'Soirée en famille',                    5, 15, 15, NULL,  true),
  (11, 'Rangement 15 min',                     6, 5,  5,  'min', true),
  (12, 'Préparer ses repas',                   6, 10, 10, NULL,  true)
ON CONFLICT (id) DO NOTHING;
-- SET search_path TO habit, public;

INSERT INTO task_templates (id, title, domain_id, default_xp, default_points, unit, is_active) VALUES
  -- Santé & Sport (1)
  (13, '10 000 pas',                          1, 10, 10, 'pas',     true),
  (14, 'Sommeil 7 h',                         1, 10, 10, 'h',       true),
  (15, 'Étirements 10 min',                   1, 5,  5,  'min',     true),
  (16, 'Yoga 20 min',                         1, 10, 10, 'min',     true),
  (17, 'Marche dehors 20 min',                1, 5,  5,  'min',     true),
  (18, 'Course 5 km',                         1, 15, 15, 'km',      true),
  (19, 'Préparer le sac de sport',            1, 5,  5,  NULL,      true),
  (20, 'Journée sans sucre ajouté',           1, 10, 10, NULL,      true),
  (21, '5 portions fruits & légumes',         1, 10, 10, 'portion', true),

  -- Travail & Projets (2)
  (22, 'Deep work 60 min',                    2, 15, 15, 'min',     true),
  (23, 'Planifier la journée',                2, 5,  5,  NULL,      true),
  (24, 'Inbox zéro',                           2, 10, 10, NULL,      true),
  (25, '4 cycles Pomodoro',                   2, 10, 10, 'cycles',  true),
  (26, 'Revue objectifs du jour',             2, 5,  5,  NULL,      true),

  -- Finances (3)
  (27, 'Saisie des dépenses du jour',         3, 5,  5,  NULL,      true),
  (28, 'Journée sans dépense',                3, 10, 10, NULL,      true),
  (29, 'Mettre 10 € d’épargne',               3, 10, 10, '€',       true),
  (30, 'Revue budget 15 min',                 3, 5,  5,  'min',     true),

  -- Esprit & Connaissance (4)
  (31, 'Journal 5 min',                       4, 5,  5,  'min',     true),
  (32, 'Gratitude : 3 choses',                4, 5,  5,  NULL,      true),
  (33, 'Langue étrangère 15 min',             4, 10, 10, 'min',     true),
  (34, 'Cours/formation 20 min',              4, 10, 10, 'min',     true),

  -- Relations & Social (5)
  (35, 'Message à un proche',                 5, 5,  5,  NULL,      true),
  (36, 'Appeler un parent',                   5, 10, 10, NULL,      true),
  (37, 'Déj / café réseau',                   5, 10, 10, NULL,      true),
  (38, 'Remercier quelqu’un',                 5, 5,  5,  NULL,      true),

  -- Maison & Vie perso (6)
  (39, 'Faire la vaisselle',                  6, 5,  5,  NULL,      true),
  (40, 'Lancer une lessive',                  6, 5,  5,  NULL,      true),
  (41, 'Sortir les poubelles',                6, 5,  5,  NULL,      true),
  (42, 'Arroser les plantes',                 6, 5,  5,  NULL,      true),
  (43, 'Préparer ses affaires pour demain',   6, 5,  5,  NULL,      true),
  (44, 'Nettoyer la cuisine 10 min',          6, 5,  5,  'min',     true),
  (45, 'Faire le lit',                        6, 5,  5,  NULL,      true)
ON CONFLICT (id) DO NOTHING;





-- Table cible : rewards
-- Colonnes : id | key | type | name | description | condition_type | condition_value | reward_data

INSERT INTO rewards (id, key, type, name, description, condition_type, condition_value, reward_data) VALUES
-- 🥇 Badges (objectifs simples)
(1, 'first_task', 'badge', 'Premier pas', 'Tu as accompli ta première action.', 'tasks_completed', '1', '{"icon":"🥇"}'),
(2, 'five_tasks', 'badge', 'Sur la lancée', '5 actions accomplies !', 'tasks_completed', '5', '{"icon":"🔥"}'),
(3, 'sport_10', 'badge', 'Sportif régulier', '10 actions liées à la santé.', 'tasks_completed_category:health', '10', '{"icon":"💪"}'),
(4, 'finance_5', 'badge', 'Fourmi prévoyante', '5 actions dans la catégorie finances.', 'tasks_completed_category:money', '5', '{"icon":"💰"}'),
(5, 'focus_week', 'badge', 'Semaine Focus', '7 jours consécutifs d’activités.', 'streak_days', '7', '{"icon":"📆"}'),
(6, 'relation_3', 'badge', 'Connecté', 'Tu as pris soin de tes relations 3 fois.', 'tasks_completed_category:relations', '3', '{"icon":"❤️"}'),
(7, 'mindset_5', 'badge', 'Sérénité', '5 actions liées au bien-être mental.', 'tasks_completed_category:mindset', '5', '{"icon":"🧘"}'),
(8, 'money_100', 'badge', 'Épargnant', 'Tu as économisé 100 € au total.', 'finance_savings_total', '100', '{"icon":"💶"}'),

-- 🏆 Trophées (objectifs globaux ou multi-domaines)
(9, 'balance_80', 'trophy', 'Équilibre parfait', 'Toutes tes barres sont supérieures à 80%.', 'stats_balance', '80', '{"icon":"⚖️"}'),
(10, 'health_master', 'trophy', 'Maître du corps', '50 actions santé réalisées.', 'tasks_completed_category:health', '50', '{"icon":"🏋️"}'),
(11, 'work_pro', 'trophy', 'Esprit productif', '50 tâches travail accomplies.', 'tasks_completed_category:work', '50', '{"icon":"💼"}'),
(12, 'zen_master', 'trophy', 'Maître du mental', '30 actions bien-être.', 'tasks_completed_category:mindset', '30', '{"icon":"🌿"}'),
(13, 'harmony_30', 'trophy', '30 jours d’harmonie', '30 jours consécutifs d’équilibre.', 'streak_days', '30', '{"icon":"🕊️"}'),
(14, 'level_10', 'trophy', 'Niveau 10 atteint', 'Tu as atteint le niveau 10 de ton personnage.', 'level_reached', '10', '{"icon":"⭐"}'),
(15, 'saver_500', 'trophy', 'Bâtisseur', '500 € économisés cumulés.', 'finance_savings_total', '500', '{"icon":"🏦"}'),

-- 🎭 Cosmétiques (équipements ou décorations)
(16, 'avatar_hat_blue', 'cosmetic', 'Casquette bleue', 'Un style sportif débloqué.', 'unlock_reward', NULL, '{"item":"hat_blue"}'),
(17, 'avatar_aura_gold', 'cosmetic', 'Aura dorée', 'Récompense d’équilibre parfait.', 'reward_dependency:balance_80', NULL, '{"item":"aura_gold"}'),
(18, 'avatar_env_city', 'cosmetic', 'Fond urbain', 'Nouvel environnement : skyline urbaine.', 'level_reached', '5', '{"item":"background_city"}'),
(19, 'avatar_env_nature', 'cosmetic', 'Fond nature', 'Débloqué grâce à ton calme intérieur.', 'tasks_completed_category:mindset', '20', '{"item":"background_forest"}'),
(20, 'avatar_outfit_neon', 'cosmetic', 'Tenue néon', 'Style spécial pour les joueurs actifs.', 'streak_days', '14', '{"item":"outfit_neon"}');



-- (Optionnel) réalignement des séquences/identities sur le max(id)
-- Utile si tes colonnes id sont en GENERATED BY DEFAULT/ALWAYS AS IDENTITY
DO
$$
DECLARE
    rec RECORD;
    seq_name text;
    max_id bigint;
BEGIN
    FOR rec IN
        SELECT 'domains' AS tbl
        UNION ALL SELECT 'rewards'
        UNION ALL SELECT 'task_templates'
    LOOP
        -- Récupérer la séquence liée (fonctionne pour SERIAL/IDENTITY)
        SELECT pg_get_serial_sequence('habit.' || rec.tbl, 'id') INTO seq_name;
        IF seq_name IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM habit.%I', rec.tbl) INTO max_id;
            EXECUTE format('SELECT setval(%L, %s, true);', seq_name, max_id);
        END IF;
    END LOOP;
END
$$;
