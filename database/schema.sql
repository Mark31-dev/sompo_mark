-- SOMPO TEAM schema (MySQL 8+)
-- Import:  mysql -u root -p sompo_team < database/schema.sql

CREATE DATABASE IF NOT EXISTS sompo_team
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sompo_team;

CREATE TABLE IF NOT EXISTS activation_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(32)  NOT NULL UNIQUE,
  label       VARCHAR(120) DEFAULT NULL,
  max_uses    INT          NOT NULL DEFAULT 0,          -- 0 = unlimited
  used_count  INT          NOT NULL DEFAULT 0,
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  expires_at  DATETIME     DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(48)  NOT NULL UNIQUE,
  avatar_key    VARCHAR(32)  NOT NULL DEFAULT 'joshua',
  activation_id INT          DEFAULT NULL,
  last_seen_at  DATETIME     DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_activation
    FOREIGN KEY (activation_id) REFERENCES activation_codes (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
  id             BIGINT       PRIMARY KEY,
  name           VARCHAR(80)  NOT NULL,
  genre          VARCHAR(60)  NOT NULL DEFAULT 'Custom Room',
  description    VARCHAR(180) NOT NULL DEFAULT '',
  quote          VARCHAR(180) NOT NULL DEFAULT '',
  cover_key      VARCHAR(32)  NOT NULL DEFAULT 'chill',
  track_id       VARCHAR(16)  NOT NULL DEFAULT 't1',
  locked         TINYINT(1)   NOT NULL DEFAULT 0,
  password_hash  VARCHAR(160) DEFAULT NULL,             -- scrypt: salt:hash
  member_count   INT          NOT NULL DEFAULT 1,
  owner_id       INT          NOT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rooms_owner
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_rooms_owner (owner_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS room_members (
  room_id   BIGINT   NOT NULL,
  user_id   INT      NOT NULL,
  role      ENUM('owner', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  CONSTRAINT fk_rm_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
  CONSTRAINT fk_rm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id    BIGINT       NOT NULL,
  user_id    INT          DEFAULT NULL,                 -- NULL = system message
  kind       ENUM('text', 'track', 'system') NOT NULL DEFAULT 'text',
  body       VARCHAR(1000) NOT NULL DEFAULT '',
  track_id   VARCHAR(16)  DEFAULT NULL,
  pinned     TINYINT(1)   NOT NULL DEFAULT 0,
  reactions  JSON         DEFAULT NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_msg_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  INDEX idx_msg_room_time (room_id, created_at)
) ENGINE=InnoDB;

-- Seed codes so a fresh install can be activated immediately.
INSERT IGNORE INTO activation_codes (code, label, max_uses) VALUES
  ('SOMPO2026', 'Launch batch',   0),
  ('TEAMVIBES', 'Team invite',    0),
  ('CHILL-01',  'Chill Vibes',   50),
  ('LOFI-2026', 'Lo-fi listeners', 50);
