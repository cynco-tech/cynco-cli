import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type ApiKeySource = 'flag' | 'env' | 'config';
export type ResolvedKey = {
	key: string;
	source: ApiKeySource;
	profile?: string;
};

export type Profile = { api_key: string };
export type CredentialsFile = {
	active_profile: string;
	profiles: Record<string, Profile>;
};

export function getConfigDir(): string {
	if (process.env.XDG_CONFIG_HOME) {
		return join(process.env.XDG_CONFIG_HOME, 'cynco');
	}
	if (process.platform === 'win32' && process.env.APPDATA) {
		return join(process.env.APPDATA, 'cynco');
	}
	return join(homedir(), '.config', 'cynco');
}

function getCredentialsPath(): string {
	return join(getConfigDir(), 'credentials.json');
}

let _cachedCreds: CredentialsFile | null | undefined;

export function readCredentials(): CredentialsFile | null {
	if (_cachedCreds !== undefined) {
		return _cachedCreds;
	}
	try {
		const data = JSON.parse(readFileSync(getCredentialsPath(), 'utf-8'));
		if (data.api_key && !data.profiles) {
			_cachedCreds = {
				active_profile: 'default',
				profiles: { default: { api_key: data.api_key } },
			};
			return _cachedCreds;
		}
		if (data.profiles) {
			_cachedCreds = {
				active_profile: data.active_profile ?? 'default',
				profiles: data.profiles,
			};
			return _cachedCreds;
		}
		_cachedCreds = null;
		return null;
	} catch {
		_cachedCreds = null;
		return null;
	}
}

export function invalidateCache(): void {
	_cachedCreds = undefined;
}

export function writeCredentials(creds: CredentialsFile): string {
	const configDir = getConfigDir();
	mkdirSync(configDir, { recursive: true, mode: 0o700 });

	const configPath = getCredentialsPath();
	writeFileSync(configPath, `${JSON.stringify(creds, null, 2)}\n`, {
		mode: 0o600,
	});
	chmodSync(configPath, 0o600);
	invalidateCache();

	return configPath;
}

export function resolveProfileName(flagValue?: string): string {
	if (flagValue) {
		return flagValue;
	}

	const envProfile = process.env.CYNCO_PROFILE;
	if (envProfile) {
		return envProfile;
	}

	const creds = readCredentials();
	if (creds?.active_profile) {
		return creds.active_profile;
	}

	return 'default';
}

export function resolveApiKey(flagValue?: string, profileName?: string): ResolvedKey | null {
	if (flagValue) {
		return { key: flagValue, source: 'flag' };
	}

	// If --profile was explicitly provided, skip the env var and go straight
	// to the config file so the env var doesn't shadow the explicit flag.
	if (!profileName) {
		const envKey = process.env.CYNCO_API_KEY;
		if (envKey) {
			return { key: envKey, source: 'env' };
		}
	}

	const creds = readCredentials();
	if (creds) {
		const profile = resolveProfileName(profileName);
		const entry = creds.profiles[profile];
		if (entry?.api_key) {
			return { key: entry.api_key, source: 'config', profile };
		}
	}

	return null;
}

export function storeApiKey(apiKey: string, profileName?: string): string {
	const profile = profileName || 'default';
	const validationError = validateProfileName(profile);
	if (validationError) {
		throw new Error(validationError);
	}
	const creds = readCredentials() || {
		active_profile: 'default',
		profiles: {},
	};

	creds.profiles[profile] = { api_key: apiKey };

	// Always set active profile to the one just stored
	creds.active_profile = profile;

	return writeCredentials(creds);
}

export function removeAllApiKeys(): string {
	const configPath = getCredentialsPath();
	unlinkSync(configPath);
	invalidateCache();
	return configPath;
}

export function removeApiKey(profileName?: string): string {
	const creds = readCredentials();
	if (!creds) {
		const configPath = getCredentialsPath();
		if (!existsSync(configPath)) {
			throw new Error('No credentials file found.');
		}
		unlinkSync(configPath);
		return configPath;
	}

	const profile = profileName || resolveProfileName();
	if (!creds.profiles[profile]) {
		throw new Error(
			`Profile "${profile}" not found. Available profiles: ${Object.keys(creds.profiles).join(', ')}`,
		);
	}
	delete creds.profiles[profile];

	if (creds.active_profile === profile) {
		const remaining = Object.keys(creds.profiles);
		creds.active_profile = remaining[0] || 'default';
	}

	if (Object.keys(creds.profiles).length === 0) {
		const configPath = getCredentialsPath();
		unlinkSync(configPath);
		return configPath;
	}

	return writeCredentials(creds);
}

export function setActiveProfile(profileName: string): void {
	const validationError = validateProfileName(profileName);
	if (validationError) {
		throw new Error(validationError);
	}
	const creds = readCredentials();
	if (!creds) {
		throw new Error('No credentials file found. Run: cynco login');
	}
	if (!creds.profiles[profileName]) {
		throw new Error(
			`Profile "${profileName}" not found. Available profiles: ${Object.keys(creds.profiles).join(', ')}`,
		);
	}
	creds.active_profile = profileName;
	writeCredentials(creds);
}

export function listProfiles(): Array<{ name: string; active: boolean }> {
	const creds = readCredentials();
	if (!creds) {
		return [];
	}
	return Object.keys(creds.profiles).map((name) => ({
		name,
		active: name === creds.active_profile,
	}));
}

export function validateProfileName(name: string): string | undefined {
	if (!name || name.length === 0) {
		return 'Profile name must not be empty';
	}
	if (name.length > 64) {
		return 'Profile name must be 64 characters or fewer';
	}
	if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
		return 'Profile name must contain only letters, numbers, dashes, and underscores';
	}
	return undefined;
}

export function renameProfile(oldName: string, newName: string): void {
	if (oldName === newName) {
		return;
	}
	const validationError = validateProfileName(newName);
	if (validationError) {
		throw new Error(validationError);
	}
	const creds = readCredentials();
	if (!creds) {
		throw new Error('No credentials file found. Run: cynco login');
	}
	if (!creds.profiles[oldName]) {
		throw new Error(
			`Profile "${oldName}" not found. Available profiles: ${Object.keys(creds.profiles).join(', ')}`,
		);
	}
	if (oldName !== newName && creds.profiles[newName]) {
		throw new Error(`Profile "${newName}" already exists.`);
	}
	const profile = creds.profiles[oldName];
	if (profile) {
		creds.profiles[newName] = profile;
	}
	delete creds.profiles[oldName];
	if (creds.active_profile === oldName) {
		creds.active_profile = newName;
	}
	writeCredentials(creds);
}

export function maskKey(key: string): string {
	if (key.length <= 8) {
		return `${key.slice(0, 3)}...`;
	}
	return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
