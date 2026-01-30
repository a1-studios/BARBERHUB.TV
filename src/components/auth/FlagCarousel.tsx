import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, animate, PanInfo, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { triggerCountryCelebration, getCountryCulturalData, CountryCulturalData } from '@/utils/countryCelebration';

// Full list of 180+ countries
const ALL_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'HR', name: 'Croatia' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MT', name: 'Malta' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'MC', name: 'Monaco' },
  { code: 'SM', name: 'San Marino' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'AD', name: 'Andorra' },
  { code: 'IS', name: 'Iceland' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'NP', name: 'Nepal' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'MV', name: 'Maldives' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'QA', name: 'Qatar' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'OM', name: 'Oman' },
  { code: 'YE', name: 'Yemen' },
  { code: 'JO', name: 'Jordan' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'SY', name: 'Syria' },
  { code: 'IL', name: 'Israel' },
  { code: 'PS', name: 'Palestine' },
  { code: 'TR', name: 'Turkey' },
  { code: 'EG', name: 'Egypt' },
  { code: 'LY', name: 'Libya' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'MA', name: 'Morocco' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'SO', name: 'Somalia' },
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'BI', name: 'Burundi' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'KM', name: 'Comoros' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'BW', name: 'Botswana' },
  { code: 'NA', name: 'Namibia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'AO', name: 'Angola' },
  { code: 'CD', name: 'Democratic Republic of the Congo' },
  { code: 'CG', name: 'Republic of the Congo' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'GA', name: 'Gabon' },
  { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'BJ', name: 'Benin' },
  { code: 'TG', name: 'Togo' },
  { code: 'GH', name: 'Ghana' },
  { code: 'CI', name: 'Ivory Coast' },
  { code: 'LR', name: 'Liberia' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'SN', name: 'Senegal' },
  { code: 'GM', name: 'Gambia' },
  { code: 'CV', name: 'Cape Verde' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'ML', name: 'Mali' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'NE', name: 'Niger' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'BZ', name: 'Belize' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'HN', name: 'Honduras' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panama' },
  { code: 'CU', name: 'Cuba' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'HT', name: 'Haiti' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BB', name: 'Barbados' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'GD', name: 'Grenada' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'DM', name: 'Dominica' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'CO', name: 'Colombia' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'GY', name: 'Guyana' },
  { code: 'SR', name: 'Suriname' },
  { code: 'BR', name: 'Brazil' },
  { code: 'PE', name: 'Peru' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'WS', name: 'Samoa' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'NR', name: 'Nauru' },
  { code: 'PW', name: 'Palau' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
];

interface FlagCarouselProps {
  selectedCountry: string | null;
  onSelect: (code: string) => void;
}

const getCountryFlag = (countryCode: string) => {
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))
  );
};

const FLAG_HEIGHT = 64;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = FLAG_HEIGHT * VISIBLE_ITEMS;

export const FlagCarousel = ({ selectedCountry, onSelect }: FlagCarouselProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(CONTAINER_HEIGHT / 2 - FLAG_HEIGHT / 2);
  const isDragging = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [celebrationData, setCelebrationData] = useState<CountryCulturalData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const filteredCountries = ALL_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Center the selected flag on mount
  useEffect(() => {
    if (selectedCountry) {
      const index = filteredCountries.findIndex(c => c.code === selectedCountry);
      if (index !== -1) {
        const centerOffset = CONTAINER_HEIGHT / 2 - FLAG_HEIGHT / 2;
        const targetY = -(index * FLAG_HEIGHT) + centerOffset;
        animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
      }
    }
  }, [selectedCountry]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentY = y.get();
    const centerOffset = CONTAINER_HEIGHT / 2 - FLAG_HEIGHT / 2;
    const nearestIndex = Math.round((-currentY + centerOffset) / FLAG_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(filteredCountries.length - 1, nearestIndex));
    
    // Snap to center
    const targetY = -(clampedIndex * FLAG_HEIGHT) + centerOffset;
    animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
    
    // Select if it was a tap (minimal drag)
    if (Math.abs(info.offset.y) < 5 && Math.abs(info.velocity.y) < 50) {
      handleFlagClick(filteredCountries[clampedIndex].code, clampedIndex);
    }

    setTimeout(() => {
      isDragging.current = false;
    }, 100);
  };

  const handleFlagClick = (code: string, index: number) => {
    if (isDragging.current) return;
    
    // Trigger explosive celebration!
    const cultural = triggerCountryCelebration(code);
    setCelebrationData(cultural);
    setShowCelebration(true);
    
    // Clear celebration after animation
    setTimeout(() => setShowCelebration(false), 2000);
    
    onSelect(code);
    
    // Center the flag
    const centerOffset = CONTAINER_HEIGHT / 2 - FLAG_HEIGHT / 2;
    const targetY = -(index * FLAG_HEIGHT) + centerOffset;
    animate(y, targetY, { type: 'spring', stiffness: 300, damping: 30 });
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background/50 border-border/50"
        />
      </div>
      
      {/* Vertical wheel container */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden flex-1"
        style={{ height: CONTAINER_HEIGHT }}
      >
        {/* Center highlight line */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-16 z-10 pointer-events-none">
          <div className="h-full border-y-2 border-primary bg-primary/5 rounded-lg" />
        </div>

        {/* Top/bottom fade gradients */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background via-background/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background via-background/80 to-transparent z-20 pointer-events-none" />

        {/* Scrollable flag list */}
        <motion.div
          className="flex flex-col items-stretch cursor-grab active:cursor-grabbing"
          style={{ y }}
          drag="y"
          dragConstraints={{
            top: -(filteredCountries.length * FLAG_HEIGHT - CONTAINER_HEIGHT / 2),
            bottom: CONTAINER_HEIGHT / 2
          }}
          dragElastic={0.1}
          onDragStart={() => { isDragging.current = true; }}
          onDragEnd={handleDragEnd}
        >
          {filteredCountries.map((country, index) => {
            const isSelected = selectedCountry === country.code;
            
            return (
              <motion.button
                key={country.code}
                type="button"
                onClick={() => handleFlagClick(country.code, index)}
                className={cn(
                  "flex items-center gap-4 w-full px-4 transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected && "bg-primary/10"
                )}
                style={{ height: FLAG_HEIGHT }}
                animate={{
                  opacity: isSelected ? 1 : 0.6,
                  scale: isSelected ? 1.02 : 1,
                }}
                whileHover={{ opacity: 1, scale: 1.02 }}
              >
                <span className="text-4xl">{getCountryFlag(country.code)}</span>
                <span className={cn(
                  "font-medium text-left flex-1 truncate",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {country.name}
                </span>
                {isSelected && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-primary font-bold"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Instructions */}
      <p className="text-center text-muted-foreground text-sm mt-4">
        ↑ Scroll to browse • Tap to select ↓
      </p>

      {/* Country Selection Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && selectedCountry && celebrationData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
          >
            {/* Giant pulsing flag */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.5, 1.2], 
                rotate: 0,
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="text-8xl mb-4"
              style={{ 
                filter: `drop-shadow(0 0 40px ${celebrationData.colors[0]})`
              }}
            >
              {getCountryFlag(selectedCountry)}
            </motion.div>

            {/* Hype phrase with emoji */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <span className="text-4xl font-black text-white drop-shadow-lg">
                {celebrationData.celebrationEmoji} {celebrationData.hypePhrase}
              </span>
            </motion.div>

            {/* Radial glow burst */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute w-32 h-32 rounded-full"
              style={{
                background: `radial-gradient(circle, ${celebrationData.colors[0]}60 0%, transparent 70%)`
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { ALL_COUNTRIES as CAROUSEL_COUNTRIES, getCountryFlag };
