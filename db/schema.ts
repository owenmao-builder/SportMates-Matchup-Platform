import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accounts = sqliteTable('club_accounts', {
  id: text('id').primaryKey(),
  phone: text('phone').notNull().unique(),
  password: text('password').notNull(),
  created: integer('created').notNull(),
});
export const sessions = sqliteTable(
  'club_sessions',
  {
    hash: text('hash').primaryKey(),
    userId: text('user_id').notNull(),
    expires: integer('expires').notNull(),
  },
  (t) => [index('club_sessions_expiry').on(t.expires)],
);
export const community = sqliteTable('club_community', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(0),
  state: text('state').notNull(),
});
export const limits = sqliteTable(
  'club_limits',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    expires: integer('expires').notNull(),
  },
  (t) => [index('club_limits_expiry').on(t.expires)],
);
export const avatars = sqliteTable(
  'club_avatars',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    requestId: text('request_id').notNull(),
    style: text('style').notNull(),
    status: text('status').notNull(),
    error: text('error').notNull().default(''),
    created: integer('created').notNull(),
  },
  (t) => [
    uniqueIndex('club_avatar_request').on(t.userId, t.requestId),
    uniqueIndex('club_avatar_processing')
      .on(t.status)
      .where(sql`${t.status}='processing'`),
    index('club_avatar_owner').on(t.userId, t.created),
  ],
);
