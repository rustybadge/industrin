// Service categories data structure for the claim form
export interface ServiceCategory {
  id: string;
  name: string;
  subcategories: string[];
}

export const SERVICE_CATEGORIES: Record<string, ServiceCategory> = {
  'maskinbearbetning': {
    id: 'maskinbearbetning',
    name: 'Maskinbearbetning',
    subcategories: [
      'CNC-bearbetning', 'CNC-fräsning', 'CNC-svarvning',
      'Automatsvarvning', 'Hårdsvarvning', 'Fleroperationsfräsning',
      'Fleroperationssvarvning', 'Arborrning', 'Bäddfräsning',
      'CNC-karusellsvarvning', 'Annat maskinbearbetning'
    ]
  },
  'industriservice': {
    id: 'industriservice',
    name: 'Industriservice & Felsökning',
    subcategories: [
      'Industriservice', 'Felsökning', 'Maskininstallation',
      'Maskinflytt', 'Industriell konsultation', 'Driftoptimering',
      'Preventivt underhåll', 'Annat industriservice'
    ]
  },
  'mekanisk-reparation': {
    id: 'mekanisk-reparation',
    name: 'Mekanisk Underhåll & Reparation',
    subcategories: [
      'Maskinreparation', 'Hydraulikservice', 'Pneumatikservice',
      'Mekaniskt underhåll', 'Komponentbyten', 'Reservdelar',
      'Underhållsavtal', 'Annat mekanisk underhåll'
    ]
  },
  'elektrisk-service': {
    id: 'elektrisk-service',
    name: 'Elektrisk Service & Automation',
    subcategories: [
      'Elektrisk reparation', 'Automation', 'Robotikservice',
      'Elkonstruktion', 'Automationsinstallation', 'PLC-programmering',
      'Frequensomriktare', 'Annat elektrisk service'
    ]
  },
  'svetsning-montage': {
    id: 'svetsning-montage',
    name: 'Svetsning & Montering',
    subcategories: [
      'MIG-svetsning', 'MAG-svetsning', 'TIG-svetsning',
      'Licenssvetsning', 'Rörsvetsning', 'Konstruktionssvetsning',
      'Maskinmontage', 'Rörmontage', 'Stålmontage',
      'Annat svetsning/montering'
    ]
  },
  'specialiserad-utrustning': {
    id: 'specialiserad-utrustning',
    name: 'Specialiserad Utrustning',
    subcategories: [
      'Kompressor & tryckluftservice', 'Avlopps- & pumpservice',
      'Travers- & lyftutrustning service', 'Entreprenadmaskiner service',
      'Kranreparation', 'Lyftanordningar', 'Annat specialiserat'
    ]
  },
  'ytbehandling': {
    id: 'ytbehandling',
    name: 'Ytbehandling & Måleri',
    subcategories: [
      'Industrimåleri', 'Ytbehandling', 'Galvanisering',
      'Pulverlackerad', 'Fosfatbehandling', 'Anodisering',
      'Annat ytbehandling'
    ]
  },
  'fastighetsunderhall': {
    id: 'fastighetsunderhall',
    name: 'Fastighetsdrift & Underhåll',
    subcategories: [
      'Fastighetsunderhåll', 'Byggnadsservice', 'HVAC-service',
      'VVS-service', 'Elinstallationer', 'Säkerhetssystem',
      'Annat fastighetsunderhåll'
    ]
  }
};

// Helper function to get all subcategories as a flat array
export function getAllSubcategories(): string[] {
  return Object.values(SERVICE_CATEGORIES).flatMap(category => category.subcategories);
}

// Helper function to get subcategories for a specific category
export function getSubcategoriesForCategory(categoryId: string): string[] {
  return SERVICE_CATEGORIES[categoryId]?.subcategories || [];
}

// Helper function to get category name by subcategory
export function getCategoryForSubcategory(subcategory: string): string | null {
  for (const category of Object.values(SERVICE_CATEGORIES)) {
    if (category.subcategories.includes(subcategory)) {
      return category.name;
    }
  }
  return null;
}
