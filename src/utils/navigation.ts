export const scrollToSection = (sectionId: string, offset: number = 80) => {
  const element = document.getElementById(sectionId);
  if (element) {
    const elementPosition = element.offsetTop - offset;
    
    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    });
  }
};

export const navigationItems = [
  { id: 'hero', label: 'Start' },
  { id: 'for-whom', label: 'Dla kogo' },
  { id: 'features', label: 'Funkcje' },
  { id: 'how-it-works', label: 'Jak działa' },
  { id: 'chat', label: 'Czat' }
];