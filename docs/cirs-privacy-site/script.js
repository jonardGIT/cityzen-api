const tocCard = document.querySelector('.toc-card');

if (tocCard) {
  const tocLinks = Array.from(tocCard.querySelectorAll('a[href^="#"]'));
  const tocStatus = tocCard.querySelector('.toc-status');
  const tocProgressBar = tocCard.querySelector('.toc-progress-bar');
  const sections = tocLinks
    .map((link) => {
      const targetId = link.getAttribute('href')?.slice(1);
      if (!targetId) {
        return null;
      }

      const section = document.getElementById(targetId);
      if (!section) {
        return null;
      }

      return { link, section, label: link.textContent?.trim() || section.id };
    })
    .filter(Boolean);

  const setActiveLink = (activeId) => {
    sections.forEach(({ link, section }, index) => {
      const isActive = section.id === activeId;
      link.classList.toggle('active-section', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'location');
        if (tocStatus) {
          tocStatus.textContent = sections[index].label;
        }
        if (tocProgressBar) {
          const progress = ((index + 1) / sections.length) * 100;
          tocProgressBar.style.width = `${progress}%`;
        }
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  if (sections.length > 0) {
    const updateActiveFromScroll = () => {
      const topOffset = 180;
      let activeSection = sections[0].section;

      sections.forEach(({ section }) => {
        if (section.getBoundingClientRect().top - topOffset <= 0) {
          activeSection = section;
        }
      });

      setActiveLink(activeSection.id);
    };

    window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveFromScroll);
    window.addEventListener('hashchange', updateActiveFromScroll);
    setActiveLink(sections[0].section.id);
    updateActiveFromScroll();
  }
}
