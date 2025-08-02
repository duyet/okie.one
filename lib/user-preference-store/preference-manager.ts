import type { UserPreferences } from "./utils"

/**
 * Generic preference manager utilities for reducing code duplication
 * and providing consistent behavior across preference types
 */

export type PreferenceKey = keyof UserPreferences
export type PreferenceValue<K extends PreferenceKey> = UserPreferences[K]

/**
 * Creates a preference setter function with consistent behavior
 */
export function createPreferenceSetter<K extends PreferenceKey>(
  key: K,
  updatePreferences: (update: Partial<UserPreferences>) => void
) {
  return (value: PreferenceValue<K>) => {
    updatePreferences({ [key]: value } as Partial<UserPreferences>)
  }
}

/**
 * Creates a preference getter function with default value support
 */
export function createPreferenceGetter<K extends PreferenceKey>(
  preferences: UserPreferences,
  key: K,
  defaultValue: PreferenceValue<K>
) {
  return preferences[key] ?? defaultValue
}

/**
 * Utility for array-based preferences (like hiddenModels)
 */
export class ArrayPreferenceManager<T> {
  constructor(
    private currentArray: T[],
    private updateFn: (newArray: T[]) => void
  ) {}

  add(item: T): void {
    if (!this.currentArray.includes(item)) {
      this.updateFn([...this.currentArray, item])
    }
  }

  remove(item: T): void {
    const newArray = this.currentArray.filter((existing) => existing !== item)
    if (newArray.length !== this.currentArray.length) {
      this.updateFn(newArray)
    }
  }

  toggle(item: T): void {
    if (this.currentArray.includes(item)) {
      this.remove(item)
    } else {
      this.add(item)
    }
  }

  has(item: T): boolean {
    return this.currentArray.includes(item)
  }

  get items(): readonly T[] {
    return this.currentArray
  }
}

/**
 * Utility for object-based preferences (like mcpSettings)
 */
export class ObjectPreferenceManager<T extends Record<string, unknown>> {
  constructor(
    private currentObject: T,
    private updateFn: (newObject: T) => void
  ) {}

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.updateFn({
      ...this.currentObject,
      [key]: value,
    })
  }

  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K] | undefined {
    return this.currentObject[key] ?? defaultValue
  }

  has(key: keyof T): boolean {
    return key in this.currentObject
  }

  delete(key: keyof T): void {
    const newObject = { ...this.currentObject }
    delete newObject[key]
    this.updateFn(newObject)
  }

  get entries(): readonly [keyof T, T[keyof T]][] {
    return Object.entries(this.currentObject) as [keyof T, T[keyof T]][]
  }
}

/**
 * Error handling utilities for preference operations
 */
export class PreferenceError extends Error {
  constructor(
    message: string,
    public readonly preferenceKey: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(`${message} (key: ${preferenceKey}, operation: ${operation})`)
    this.name = "PreferenceError"
  }
}

/**
 * Validation utilities for preferences
 */
export const validators = {
  layout: (value: unknown): value is UserPreferences["layout"] => {
    return (
      typeof value === "string" && ["sidebar", "fullscreen"].includes(value)
    )
  },

  boolean: (value: unknown): value is boolean => {
    return typeof value === "boolean"
  },

  stringArray: (value: unknown): value is string[] => {
    return (
      Array.isArray(value) && value.every((item) => typeof item === "string")
    )
  },

  mcpSettings: (value: unknown): value is Record<string, boolean> => {
    return (
      typeof value === "object" &&
      value !== null &&
      Object.values(value).every((v) => typeof v === "boolean")
    )
  },
}

/**
 * Type for preferences data during migration (can be partial or unknown structure)
 */
type PreferencesData = Record<string, unknown>

/**
 * Type for migration function that transforms preferences from one version to another
 */
type MigrationFunction = (preferences: PreferencesData) => PreferencesData

/**
 * Migration utilities for preference schema changes
 */
export class PreferenceMigrator {
  private migrations: Array<{
    version: number
    migrate: MigrationFunction
  }> = []

  addMigration(version: number, migrate: MigrationFunction) {
    this.migrations.push({ version, migrate })
    this.migrations.sort((a, b) => a.version - b.version)
  }

  migrate(
    preferences: PreferencesData,
    fromVersion: number,
    toVersion: number
  ): PreferencesData {
    let result = preferences

    for (const migration of this.migrations) {
      if (migration.version > fromVersion && migration.version <= toVersion) {
        try {
          result = migration.migrate(result)
        } catch (error) {
          console.error(
            `Migration to version ${migration.version} failed:`,
            error
          )
          throw new PreferenceError(
            "Migration failed",
            "unknown",
            `migrate-to-${migration.version}`,
            error instanceof Error ? error : undefined
          )
        }
      }
    }

    return result
  }
}
