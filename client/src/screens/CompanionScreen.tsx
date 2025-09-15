import { useTranslation } from 'react-i18next';

type CompanionKey = 'medic' | 'tarologist' | 'lawyer' | 'fitness';

export interface CompanionScreenProps {
  value?: CompanionKey;
  onChange?: (role: CompanionKey) => void;
}

const roles: CompanionKey[] = ['medic', 'tarologist', 'lawyer', 'fitness'];

export function CompanionScreen({ value, onChange }: CompanionScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 text-center text-sm text-muted-foreground">
        {t('companion.title')}
      </div>
      <div className="flex-1 overflow-auto px-4">
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => onChange?.(r)}
              className={`p-4 rounded-lg border text-sm ${value === r ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
            >
              {t(`companion.${r}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 border-t bg-background">
        <div className="grid grid-cols-4 gap-2">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => onChange?.(r)}
              className={`py-2 px-2 rounded-md text-xs border ${value === r ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
            >
              {t(`companion.${r}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CompanionScreen;
