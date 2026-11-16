// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 alibaba/open-code-review Contributors

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { dirname, join } from 'path';
import { ConfigEntry } from '@shared/configUtils';
import { OcrConfig } from '@shared/types';
import { CliService } from './CliService';
import { applyConfigEntries, RawConfig } from './configDraft';
import { parseConfig, toConfigSetArgs } from './configParse';

export class ConfigService {
  constructor(private cli: CliService) {}

  private configPath(): string {
    return join(homedir(), '.opencodereview', 'config.json');
  }

  read(): OcrConfig | null {
    const p = this.configPath();
    if (!existsSync(p)) return null;
    try {
      return parseConfig(readFileSync(p, 'utf8'));
    } catch {
      return null;
    }
  }

  private readRaw(): RawConfig {
    const p = this.configPath();
    if (!existsSync(p)) return {};
    try {
      return JSON.parse(readFileSync(p, 'utf8')) as RawConfig;
    } catch {
      return {};
    }
  }

  private readRawForUpdate(): RawConfig {
    const p = this.configPath();
    if (!existsSync(p)) return {};
    const parsed: unknown = JSON.parse(readFileSync(p, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Cannot save global review prompt: OCR config must be a JSON object.');
    }
    return parsed as RawConfig;
  }

  private writeRaw(raw: RawConfig): OcrConfig | null {
    const p = this.configPath();
    const hasContent = Object.values(raw).some((value) => {
      if (typeof value === 'string') return value.length > 0;
      if (typeof value === 'number' || typeof value === 'boolean') return true;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && typeof value === 'object' && Object.keys(value).length > 0;
    });
    if (!hasContent) {
      if (existsSync(p)) unlinkSync(p);
      return null;
    }
    const dir = dirname(p);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o755 });
    writeFileSync(p, JSON.stringify(raw, null, 2), { encoding: 'utf8', mode: 0o600 });
    return this.read();
  }

  deleteCustomProvider(name: string): OcrConfig | null {
    const raw = this.readRaw();
    if (!raw.custom_providers?.[name]) return this.read();
    delete raw.custom_providers[name];
    if (Object.keys(raw.custom_providers).length === 0) {
      delete raw.custom_providers;
    }
    if (raw.provider === name) {
      delete raw.provider;
      delete raw.model;
    }
    return this.writeRaw(raw);
  }

  /** Run ocr llm test with an isolated temporary HOME without modifying ~/.opencodereview/config.json. */
  async testWithEntries(entries: ConfigEntry[]): Promise<{ ok: boolean; message?: string }> {
    const draft = applyConfigEntries(this.readRaw(), entries);
    const testHome = mkdtempSync(join(tmpdir(), 'ocr-test-home-'));
    const configDir = join(testHome, '.opencodereview');
    const configPath = join(configDir, 'config.json');
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
    writeFileSync(configPath, JSON.stringify(draft, null, 2), { encoding: 'utf8', mode: 0o600 });
    try {
      return await this.cli.testConnection({ home: testHome });
    } finally {
      if (existsSync(testHome)) rmSync(testHome, { recursive: true, force: true });
    }
  }

  async set(key: string, value: string): Promise<OcrConfig | null> {
    if (key === 'review_prompt') return this.setReviewPrompt(value);
    await this.cli.runRaw(toConfigSetArgs(key, value), process.cwd(), () => {});
    return this.read();
  }

  async setMany(entries: { key: string; value: string }[]): Promise<OcrConfig | null> {
    if (entries.length === 1 && entries[0].key === 'review_prompt') {
      return this.setReviewPrompt(entries[0].value);
    }
    for (const entry of entries) {
      await this.cli.runRaw(toConfigSetArgs(entry.key, entry.value), process.cwd(), () => {});
    }
    return this.read();
  }

  private setReviewPrompt(value: string): OcrConfig | null {
    const raw = this.readRawForUpdate();
    raw.review_prompt = value;
    console.debug('[ConfigService] saving global review prompt', { characters: value.length });
    return this.writeRaw(raw);
  }
}
