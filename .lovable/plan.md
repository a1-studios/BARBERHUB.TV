

# Profile Page Cleanup, Country Lock & Booking Button

## Summary

This plan consolidates the Profile page into a minimalist single-card layout, integrates Barber Bucks into the header, permanently locks nationality selection after Arena Gate verification, and adds a placeholder "Book" button on public barber profiles for future implementation.

## Current Issues

Based on the screenshots and code analysis:

1. **Multiple duplicate edit options**: "Edit Profile" button, "Barber Settings" button, and "Edit Barber Profile" button all visible
2. **BB Wallet in separate sidebar**: Takes up valuable screen space in a 3-column grid
3. **Country selector still changeable**: Both `Profile.tsx` and `BarberSettings.tsx` allow barbers to change their nationality
4. **Personal Information card redundant for barbers**: BarberProfileHeader already shows the key information
5. **No booking button**: Visitors to a barber's public profile have no way to express booking intent

## Solution Overview

```text
BEFORE (Current Layout):
┌──────────────────────┐  ┌────────────┐
│ Barber Header        │  │            │
├──────────────────────┤  │ BB Wallet  │
│ Personal Info Card   │  │ Card       │
│ - Avatar Upload      │  │            │
│ - Name/Username      │  │            │
│ - Country (editable) │  └────────────┘
│ - [Edit Profile]     │
│ - [Barber Settings]  │
│ - [Edit Barber Prof] │
└──────────────────────┘

AFTER (Consolidated):
┌─────────────────────────────────────────┐
│ ┌──────┐  CJ 🇺🇸 Texture          ┌───┐ │
│ │Avatar│  📍 NYC                  │125│ │
│ └──────┘                          │BB │ │
│ 7 Followers  7 Likes  5 Subs      └───┘ │
│ ┌────────────────┐ ┌────────────────┐   │
│ │ View Profile   │ │   Settings     │   │
│ └────────────────┘ └────────────────┘   │
└─────────────────────────────────────────┘
│ My Battles Section                      │
└─────────────────────────────────────────┘
```

## Technical Changes

### 1. `src/components/barber/BarberProfileHeader.tsx`

**Add BB balance display and consolidate actions:**

```tsx
interface BarberProfileHeaderProps {
  // ...existing props
  barberBucks?: number;           // NEW
  onAddFundsClick?: () => void;   // NEW
  onSettingsClick?: () => void;   // RENAME from onEditClick
}
```

**BB display in top-right corner:**
```tsx
{/* Compact BB Display - Top Right */}
{barberBucks !== undefined && (
  <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/20">
    <Coins className="h-4 w-4 text-cyan-400" />
    <span className="text-sm font-bold text-white">{barberBucks.toLocaleString()}</span>
    <span className="text-xs text-muted-foreground">BB</span>
    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onAddFundsClick}>
      <Plus className="h-3 w-3 text-cyan-400" />
    </Button>
  </div>
)}
```

**Consolidate action buttons (remove "Edit Profile", keep single "Settings"):**
```tsx
{showActions && (
  <div className="flex gap-3 flex-wrap pt-2">
    {barber_id && (
      <Link to={`/barbers/${barber_id}`}>
        <Button variant="outline" size="sm">
          <ExternalLink className="w-4 h-4 mr-2" />
          View Public Profile
        </Button>
      </Link>
    )}
    {onSettingsClick && (
      <Button variant="outline" size="sm" onClick={onSettingsClick}>
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </Button>
    )}
  </div>
)}
```

### 2. `src/pages/Profile.tsx`

**Remove:**
- Grid layout with sidebar (lines 340-488)
- Separate `<BBWalletCard />` component
- Personal Information Card for barbers (redundant with header)
- Duplicate "Edit Profile", "Barber Settings", "Edit Barber Profile" buttons

**Simplified Layout:**
```tsx
return (
  <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
    <Header />
    <main className="pt-20 sm:pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <BackButton className="mb-4 sm:mb-6" />
        
        {/* Unified Barber Header with BB */}
        {isBarber && barberProfile && barberStats && (
          <div className="mb-6">
            <BarberProfileHeader
              {...props}
              barberBucks={barberBucksBalance}
              onAddFundsClick={() => setShowAddFundsModal(true)}
              onSettingsClick={() => setShowBarberSettings(true)}
            />
          </div>
        )}
        
        {/* Fan profile card (simplified) - only show for non-barbers */}
        {!isBarber && (
          <Card className="mb-6">
            {/* Minimal fan profile info */}
          </Card>
        )}
        
        {/* My Battles Section - Barbers Only */}
        {isBarber && myBattles && ...}
      </div>
    </main>
    
    <AddFundsModal isOpen={showAddFundsModal} onClose={...} />
  </div>
);
```

**Add useBarberBucks hook:**
```tsx
const { barberBucks: barberBucksBalance, setShowAddFundsModal, showAddFundsModal } = useBarberBucks();
```

### 3. `src/components/profiles/BarberSettings.tsx`

**Lock country selectors in Profile tab (around line 329):**
```tsx
<div>
  <Label className="flex items-center gap-2">
    Country
    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
      <Lock className="h-3 w-3 mr-1" />
      Locked
    </Badge>
  </Label>
  <CountrySelector
    value={profileForm.country_code}
    onChange={() => {}} // No-op
    placeholder="Set during Arena Gate"
    disabled={true}
  />
  <p className="text-xs text-amber-500/80 mt-1">
    Nationality is permanently set during sign-up
  </p>
</div>
```

**Lock country in Professional tab (around line 430):**
```tsx
<div>
  <Label>Professional Country</Label>
  <CountrySelector
    value={barberForm.country_code}
    onChange={() => {}}
    placeholder="Set during Arena Gate"
    disabled={true}
  />
  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
    <Lock className="h-3 w-3" />
    Represents your nation in World Cup battles
  </p>
</div>
```

### 4. `src/components/profiles/BarberProfileForm.tsx`

**Lock nationality for existing profiles:**
```tsx
<div>
  <Label className="flex items-center gap-2">
    <Globe className="h-4 w-4" />
    Nationality *
    {existingProfile?.country_code && (
      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
        <Lock className="h-3 w-3 mr-1" />
        Locked
      </Badge>
    )}
  </Label>
  <CountrySelector
    value={formData.country_code}
    onChange={(code) => {
      // Only allow change if no existing country
      if (!existingProfile?.country_code) {
        setFormData({ ...formData, country_code: code || '' });
      }
    }}
    placeholder="Select your country"
    disabled={!!existingProfile?.country_code}
  />
  {existingProfile?.country_code ? (
    <p className="text-xs text-amber-500/80 mt-1 flex items-center gap-1">
      <Lock className="h-3 w-3" />
      Nationality cannot be changed after initial setup
    </p>
  ) : (
    <p className="text-xs text-muted-foreground mt-1">
      Used for country vs country tournament matchmaking
    </p>
  )}
</div>
```

### 5. `src/pages/BarberPublicProfile.tsx`

**Add "Book" button placeholder to the action buttons:**

```tsx
{/* Action Buttons */}
<div className="flex gap-3 flex-wrap">
  <BarberActionButtons
    barberId={barberData.barber_id}
    barberUserId={userId!}
    onDonateClick={() => setIsDonationModalOpen(true)}
  />
  
  {/* Book Button - Placeholder for future booking system */}
  {!isOwner && (
    <Button 
      variant="default" 
      size="default"
      className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
      onClick={() => toast.info("Booking system coming soon!")}
    >
      <Calendar className="w-4 h-4 mr-2" />
      Book Appointment
    </Button>
  )}
</div>
```

**Add Calendar import:**
```tsx
import { ArrowLeft, MapPin, Award, Upload, Image as ImageIcon, Video, Trash2, Calendar } from 'lucide-react';
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/barber/BarberProfileHeader.tsx` | Add BB display (top-right), rename `onEditClick` to `onSettingsClick`, add `barberBucks` and `onAddFundsClick` props, add Coins/Plus icons |
| `src/pages/Profile.tsx` | Remove grid/sidebar, remove duplicate buttons, remove BBWalletCard sidebar, pass BB props to header, add useBarberBucks hook, add AddFundsModal |
| `src/components/profiles/BarberSettings.tsx` | Lock both country selectors with `disabled={true}`, add Lock icon + explanatory text |
| `src/components/profiles/BarberProfileForm.tsx` | Lock country selector if `existingProfile?.country_code` exists |
| `src/pages/BarberPublicProfile.tsx` | Add "Book Appointment" button placeholder for non-owners |

## Visual Summary

**Profile Page (Owner View):**
- Single unified header card with avatar, name, flag, stats
- BB balance in top-right corner with quick "+" action
- Single "Settings" button → opens BarberSettings
- Single "View Public Profile" button → opens public page
- My Battles section below

**Barber Settings:**
- Country selectors show lock icon with "Locked" badge
- Disabled inputs with amber text explaining permanence

**Public Barber Profile (Visitor View):**
- All existing action buttons (Follow, Like, Subscribe, Donate)
- NEW: Cyan "Book Appointment" button
- Toast message "Booking system coming soon!" when clicked

## Summary

This implementation:
1. **Consolidates** the profile page into a clean single-card layout
2. **Integrates** BB balance minimally into the header (cyan accent, matches design system)
3. **Removes** 3 duplicate edit/settings buttons → single "Settings" action
4. **Permanently locks** nationality selection with visual indicators (Lock icon + "Locked" badge)
5. **Adds** booking button placeholder on public profiles for future implementation
6. **Maintains** the minimalist design philosophy with maximum content, minimum chrome

