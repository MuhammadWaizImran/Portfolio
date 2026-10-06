(() => {
  const section = document.getElementById('skills');
  if (!section || !('IntersectionObserver' in window)) return;
  section.classList.add('skills-motion');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
      if (entry.isIntersecting) entry.target.classList.add('has-entered');
    }
  }, {threshold:0.08});
  window.observePortfolioSkills=()=>section.querySelectorAll('.skill-domain').forEach(domain => observer.observe(domain));
  window.observePortfolioSkills();
})();
