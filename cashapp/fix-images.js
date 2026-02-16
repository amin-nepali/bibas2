/**
 * Image Fix Script
 * Handles broken image links by replacing them with local fallbacks
 */

document.addEventListener('DOMContentLoaded', function() {
  // Fix all images with broken sources
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    img.addEventListener('error', function() {
      console.log('Image error:', this.src, ' - using fallback');
      this.src = 'icons/person-circle-svgrepo-com.png';
      this.style.opacity = '0.5';
    });
    
    // Check if image src is empty or undefined
    if (!this.src || this.src === '' || this.src === 'undefined') {
      this.src = 'icons/person-circle-svgrepo-com.png';
    }
  });

  // Fix background images
  const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
  elementsWithBg.forEach(el => {
    const bgStyle = el.getAttribute('style');
    if (bgStyle && bgStyle.includes('undefined')) {
      // Replace undefined URLs with fallback
      const fixedStyle = bgStyle.replace(/url\('undefined/g, "url('icons/person-circle-svgrepo-com.png");
      el.setAttribute('style', fixedStyle);
      el.style.backgroundColor = '#cccccc';
    }
  });

  // Fix video elements
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    video.addEventListener('error', function() {
      console.log('Video error:', this.src);
      this.style.display = 'none';
    });
    if (!this.src) {
      this.style.display = 'none';
    }
  });

  console.log('✅ Image fallbacks loaded');
});

// Global fallback styling
const style = document.createElement('style');
style.textContent = `
  img[src=""] {
    content: url('icons/person-circle-svgrepo-com.png');
  }
  
  .profile-icon,
  .avatar {
    background-size: cover;
    background-position: center;
    background-color: #cccccc;
  }
  
  .avatar {
    min-width: 40px;
    min-height: 40px;
    border-radius: 50%;
  }
`;
document.head.appendChild(style);
