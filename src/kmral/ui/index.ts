export type KMRALButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type KMRALButtonSpec = {
  label: string;
  variant?: KMRALButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export type KMRALAppShellSpec = {
  appId: string;
  title: string;
  navigation: string[];
};

export function createButtonSpec(spec: KMRALButtonSpec): KMRALButtonSpec {
  return {
    variant: 'primary',
    disabled: false,
    ...spec,
  };
}

export function createAppShellSpec(spec: KMRALAppShellSpec): KMRALAppShellSpec {
  if (!spec.appId.trim()) throw new Error('appId is required');
  if (!spec.title.trim()) throw new Error('title is required');
  return { ...spec, navigation: [...spec.navigation] };
}
