import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMPONENT_STATUS_COLORS, COMPONENT_STATUS_LABELS, type ComponentStatus } from '@prime-garage/shared';
import { BRAND } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  padded = true,
  wide = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  wide?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const inner = (
    <View className={`w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'} self-center ${padded ? 'px-4 pt-4' : ''}`} style={{ paddingBottom: insets.bottom + 24 }}>
      {children}
    </View>
  );
  if (!scroll) return <View className="flex-1 bg-slate-50 dark:bg-slate-950">{inner}</View>;
  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" keyboardShouldPersistTaps="handled">
      {inner}
    </ScrollView>
  );
}

export function Card({ children, className = '', onPress }: { children: ReactNode; className?: string; onPress?: () => void }) {
  const base = `rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${base} active:opacity-80`}>
        {children}
      </Pressable>
    );
  }
  return <View className={base}>{children}</View>;
}

export function Title({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={`text-2xl font-bold text-slate-900 dark:text-white ${className}`}>{children}</Text>;
}

export function Heading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={`text-lg font-semibold text-slate-900 dark:text-white ${className}`}>{children}</Text>;
}

export function Body({ children, className = '', numberOfLines }: { children: ReactNode; className?: string; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} className={`text-base text-slate-700 dark:text-slate-200 ${className}`}>
      {children}
    </Text>
  );
}

export function Muted({ children, className = '', numberOfLines }: { children: ReactNode; className?: string; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} className={`text-sm text-slate-500 dark:text-slate-400 ${className}`}>
      {children}
    </Text>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const BUTTON_STYLES: Record<ButtonVariant, { box: string; text: string; spinner: string }> = {
  primary: { box: 'bg-brand-600 active:bg-brand-700', text: 'text-white', spinner: '#fff' },
  secondary: {
    box: 'border border-slate-300 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
    spinner: '#404040',
  },
  ghost: { box: 'bg-transparent active:bg-slate-100 dark:active:bg-slate-800', text: 'text-brand-600', spinner: BRAND.orangeStrong },
  danger: { box: 'bg-red-50 border border-red-200 active:bg-red-100 dark:bg-red-950 dark:border-red-900', text: 'text-red-700 dark:text-red-300', spinner: '#b91c1c' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  className = '',
  small = false,
  testID,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  small?: boolean;
  testID?: string;
}) {
  const s = BUTTON_STYLES[variant];
  const dark = useColorScheme() === 'dark';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-xl ${small ? 'px-3 py-2' : 'px-4 py-3'} ${s.box} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={s.spinner} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={small ? 16 : 18} color={variant === 'primary' ? '#fff' : variant === 'danger' ? '#b91c1c' : variant === 'ghost' ? BRAND.orangeStrong : dark ? '#d4d4d4' : '#404040'} />
      ) : null}
      <Text className={`${small ? 'text-sm' : 'text-base'} font-semibold ${s.text}`}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color = '#404040' }: { icon: IconName; onPress: () => void; label: string; color?: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} hitSlop={8} className="rounded-full p-2 active:bg-slate-200 dark:active:bg-slate-800">
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function Field({
  label,
  error,
  hint,
  className = '',
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string; className?: string }) {
  return (
    <View className={`mb-3 ${className}`}>
      <Text className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#a3a3a3"
        className={`rounded-xl border bg-white px-3 py-3 text-base text-slate-900 dark:bg-slate-900 dark:text-white ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
        {...props}
      />
      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : hint ? <Muted className="mt-1">{hint}</Muted> : null}
    </View>
  );
}

export type SelectOption<T extends string | number> = { value: T; label: string; description?: string };

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Pilih...',
  error,
  searchable = false,
  className = '',
}: {
  label: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(
    () => (query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options),
    [options, query],
  );
  return (
    <View className={`mb-3 ${className}`}>
      <Text className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between rounded-xl border bg-white px-3 py-3 dark:bg-slate-900 ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
      >
        <Text className={`flex-1 text-base ${selected ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#737373" />
      </Pressable>
      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)} />
        <View
          className="max-h-[75%] w-full max-w-3xl self-center rounded-t-3xl bg-white dark:bg-slate-900"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <Heading>{label}</Heading>
            <IconButton icon="close" label="Tutup" onPress={() => setOpen(false)} />
          </View>
          {searchable ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cari..."
              placeholderTextColor="#a3a3a3"
              className="mx-4 mt-3 rounded-xl border border-slate-300 px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:text-white"
            />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.value)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                  setQuery('');
                }}
                className={`border-b border-slate-100 px-4 py-3 active:bg-slate-100 dark:border-slate-800 ${item.value === value ? 'bg-brand-50 dark:bg-slate-800' : ''}`}
              >
                <Body>{item.label}</Body>
                {item.description ? <Muted>{item.description}</Muted> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

export function SwitchRow({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <View className="flex-1 pr-3">
        <Body>{label}</Body>
        {description ? <Muted>{description}</Muted> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: BRAND.orangeStrong }} />
    </View>
  );
}

export function StatusBadge({ status }: { status: ComponentStatus }) {
  const color = COMPONENT_STATUS_COLORS[status];
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2 py-1" style={{ backgroundColor: `${color}22` }}>
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs font-semibold" style={{ color }}>
        {COMPONENT_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

export function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <View className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: color }} />
    </View>
  );
}

export function Loading({ label = 'Memuat...' }: { label?: string }) {
  return (
    <View className="items-center justify-center p-10">
      <ActivityIndicator color={BRAND.orangeStrong} />
      <Muted className="mt-2">{label}</Muted>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="items-center p-8">
      <Ionicons name="cloud-offline-outline" size={36} color="#a3a3a3" />
      <Body className="mt-2 text-center">{message}</Body>
      {onRetry ? <Button title="Coba lagi" variant="secondary" onPress={onRetry} className="mt-3" small /> : null}
    </View>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: ReactNode }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-slate-300 p-8 dark:border-slate-700">
      <Ionicons name={icon} size={40} color="#a3a3a3" />
      <Heading className="mt-3 text-center">{title}</Heading>
      <Muted className="mt-1 text-center">{message}</Muted>
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full border px-3 py-1.5 ${active ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
    >
      <Text className={`text-sm ${active ? 'font-semibold text-white' : 'text-slate-700 dark:text-slate-200'}`}>{label}</Text>
    </Pressable>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View className="flex-row justify-between border-b border-slate-100 py-2 dark:border-slate-800">
      <Muted>{label}</Muted>
      <Text className="ml-4 flex-1 text-right text-sm font-medium text-slate-800 dark:text-slate-100">{value ?? '-'}</Text>
    </View>
  );
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; icon: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
      {tabs.map((t) => (
        <Pressable
          key={t.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: t.value === value }}
          onPress={() => onChange(t.value)}
          className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg py-2 ${t.value === value ? 'bg-white dark:bg-slate-950' : ''}`}
        >
          <Ionicons name={t.icon} size={16} color={t.value === value ? BRAND.orangeStrong : '#737373'} />
          <Text className={`text-sm ${t.value === value ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500'}`}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
