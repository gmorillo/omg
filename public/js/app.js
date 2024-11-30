const displacementSlider = function(opts) {

    let vertex = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `;

    let fragment = `
        
        varying vec2 vUv;

        uniform sampler2D currentImage;
        uniform sampler2D nextImage;

        uniform float dispFactor;

        void main() {

            vec2 uv = vUv;
            vec4 _currentImage;
            vec4 _nextImage;
            float intensity = 0.3;

            vec4 orig1 = texture2D(currentImage, uv);
            vec4 orig2 = texture2D(nextImage, uv);
            
            _currentImage = texture2D(currentImage, vec2(uv.x, uv.y + dispFactor * (orig2 * intensity)));

            _nextImage = texture2D(nextImage, vec2(uv.x, uv.y + (1.0 - dispFactor) * (orig1 * intensity)));

            vec4 finalTexture = mix(_currentImage, _nextImage, dispFactor);

            gl_FragColor = finalTexture;

        }
    `;

    let images = opts.images, image, sliderImages = [];;
    let canvasWidth = images[0].clientWidth;
    let canvasHeight = images[0].clientHeight;
    let parent = opts.parent;
    let renderWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    let renderHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    let imageAspectRatio = opts.images[0].naturalWidth / opts.images[0].naturalHeight;
    let screenAspectRatio = window.innerWidth / window.innerHeight;

    let originalRenderW, originalRenderH;

    if (screenAspectRatio > imageAspectRatio) {
        originalRenderW = window.innerWidth;
        originalRenderH = window.innerWidth / imageAspectRatio;
    } else {
        originalRenderW = window.innerHeight * imageAspectRatio;
        originalRenderH = window.innerHeight;
    }

    // Reducir el tamaño en un 20%
    let reductionFactor = 0.8; // 1 - 0.20
    let newRenderW = originalRenderW * reductionFactor;
    let newRenderH = originalRenderH * reductionFactor;

    let renderer = new THREE.WebGLRenderer({
        antialias: false,
    });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x23272A, 1.0);
    renderer.setSize(newRenderW, newRenderH);
    parent.appendChild(renderer.domElement);

    let loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    images.forEach( ( img ) => {

        image = loader.load( img.getAttribute( 'src' ) + '?v=' + Date.now() );
        image.magFilter = image.minFilter = THREE.LinearFilter;
        image.anisotropy = renderer.capabilities.getMaxAnisotropy();
        sliderImages.push( image );

    });

    let scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x23272A );
    let camera = new THREE.OrthographicCamera(
        renderWidth / -2,
        renderWidth / 2,
        renderHeight / 2,
        renderHeight / -2,
        1,
        1000
    );

    camera.position.z = 1;

    let mat = new THREE.ShaderMaterial({
        uniforms: {
            dispFactor: { type: "f", value: 0.0 },
            currentImage: { type: "t", value: sliderImages[0] },
            nextImage: { type: "t", value: sliderImages[1] },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        opacity: 1.0
    });

    let geometry = new THREE.PlaneBufferGeometry(
        parent.offsetWidth,
        parent.offsetHeight,
        1
    );
    let object = new THREE.Mesh(geometry, mat);
    object.position.set(0, 0, 0);
    scene.add(object);

    let addEvents = function(){

        let pagButtons = Array.from(document.getElementById('pagination').querySelectorAll('button'));
        let isAnimating = false;

        pagButtons.forEach( (el) => {

            el.addEventListener('click', function() {

                if( !isAnimating ) {

                    isAnimating = true;

                    document.getElementById('pagination').querySelectorAll('.active')[0].className = '';
                    this.className = 'active';

                    let slideId = parseInt( this.dataset.slide, 10 );

                    mat.uniforms.nextImage.value = sliderImages[slideId];
                    mat.uniforms.nextImage.needsUpdate = true;

                    TweenLite.to( mat.uniforms.dispFactor, 1, {
                        value: 1,
                        ease: 'Expo.easeInOut',
                        onComplete: function () {
                            mat.uniforms.currentImage.value = sliderImages[slideId];
                            mat.uniforms.currentImage.needsUpdate = true;
                            mat.uniforms.dispFactor.value = 0.0;
                            isAnimating = false;
                        }
                    });

                    let slideTitleEl = document.getElementById('slide-title');
                    let slideStatusEl = document.getElementById('slide-status');
                    let nextSlideTitle = document.querySelectorAll(`[data-slide-title="${slideId}"]`)[0].innerHTML;
                    let nextSlideStatus = document.querySelectorAll(`[data-slide-status="${slideId}"]`)[0].innerHTML;

                    TweenLite.fromTo( slideTitleEl, 0.5,
                        {
                            autoAlpha: 1,
                            filter: 'blur(0px)',
                            y: 0
                        },
                        {
                            autoAlpha: 0,
                            filter: 'blur(10px)',
                            y: 20,
                            ease: 'Expo.easeIn',
                            onComplete: function () {
                                slideTitleEl.innerHTML = nextSlideTitle;

                                TweenLite.to( slideTitleEl, 0.5, {
                                    autoAlpha: 1,
                                    filter: 'blur(0px)',
                                    y: 0,
                                })
                            }
                        });

                    TweenLite.fromTo( slideStatusEl, 0.5,
                        {
                            autoAlpha: 1,
                            filter: 'blur(0px)',
                            y: 0
                        },
                        {
                            autoAlpha: 0,
                            filter: 'blur(10px)',
                            y: 20,
                            ease: 'Expo.easeIn',
                            onComplete: function () {
                                slideStatusEl.innerHTML = nextSlideStatus;

                                TweenLite.to( slideStatusEl, 0.5, {
                                    autoAlpha: 1,
                                    filter: 'blur(0px)',
                                    y: 0,
                                    delay: 0.1,
                                })
                            }
                        });

                }
                clearInterval(autoChangeInterval);
            });

            el.addEventListener('touchmove', function(event) {
                event.preventDefault();
                // ...
            });
    
            el.addEventListener('touchend', function(event) {
                event.preventDefault();
                // ...
            });

        });

        // Agrega evento de swipe para cambiar la diapositiva
    let swipeStartX, swipeStartY;
    let swipeThreshold = 50;

    document.getElementById('slider').addEventListener('touchstart', function(event) {
        swipeStartX = event.touches[0].clientX;
        swipeStartY = event.touches[0].clientY;
    });

    document.getElementById('slider').addEventListener('touchmove', function(event) {
        event.preventDefault();
    });

    document.getElementById('slider').addEventListener('touchend', function(event) {
        let swipeEndX = event.changedTouches[0].clientX;
        let swipeEndY = event.changedTouches[0].clientY;
    
        let swipeDistanceX = swipeEndX - swipeStartX;
        let swipeDistanceY = swipeEndY - swipeStartY;
    
        if (Math.abs(swipeDistanceX) > swipeThreshold) {
            if (swipeDistanceX > 0) {
                // Cambia a la diapositiva anterior
                currentSlideIndex = (currentSlideIndex - 1 + sliderImages.length) % sliderImages.length;
            } else {
                // Cambia a la diapositiva siguiente
                currentSlideIndex = (currentSlideIndex + 1) % sliderImages.length;
            }
    
            // Actualiza la paginación
            document.getElementById('pagination').querySelectorAll('.active')[0].className = '';
            document.querySelectorAll(`[data-slide="${currentSlideIndex}"]`)[0].className = 'active';
    
            mat.uniforms.nextImage.value = sliderImages[currentSlideIndex];
            mat.uniforms.nextImage.needsUpdate = true;
    
            TweenLite.to(mat.uniforms.dispFactor, 1, {
                value: 1,
                ease: 'Expo.easeInOut',
                onComplete: function() {
                    mat.uniforms.currentImage.value = sliderImages[currentSlideIndex];
                    mat.uniforms.currentImage.needsUpdate = true;
                    mat.uniforms.dispFactor.value = 0.0;
                }
            });
    
            // Actualiza el título y el estado de la diapositiva
            let slideTitleEl = document.getElementById('slide-title');
            let slideStatusEl = document.getElementById('slide-status');
            let nextSlideTitle = document.querySelectorAll(`[data-slide-title="${currentSlideIndex}"]`)[0].innerHTML;
            let nextSlideStatus = document.querySelectorAll(`[data-slide-status="${currentSlideIndex}"]`)[0].innerHTML;
    
            TweenLite.fromTo(slideTitleEl, 0.5, {
                autoAlpha: 1,
                filter: 'blur(0px)',
                y: 0
            }, {
                autoAlpha: 0,
                filter: 'blur(10px)',
                y: 20,
                ease: 'Expo.easeIn',
                onComplete: function() {
                    slideTitleEl.innerHTML = nextSlideTitle;
    
                    TweenLite.to(slideTitleEl, 0.5, {
                        autoAlpha: 1,
                        filter: 'blur(0px)',
                        y: 0,
                    })
                }
            });
    
            TweenLite.fromTo(slideStatusEl, 0.5, {
                autoAlpha: 1,
                filter: 'blur(0px)',
                y: 0
            }, {
                autoAlpha: 0,
                filter: 'blur(10px)',
                y: 20,
                ease: 'Expo.easeIn',
                onComplete: function() {
                    slideStatusEl.innerHTML = nextSlideStatus;
    
                    TweenLite.to(slideStatusEl, 0.5, {
                        autoAlpha: 1,
                        filter: 'blur(0px)',
                        y: 0,
                        delay: 0.1,
                    })
                }
            });
        }
        clearInterval(autoChangeInterval);
        autoChangeInterval = setInterval(autoChangeSlide, 5000);
    });

    };

    addEvents();

    // Agrega una variable para almacenar el índice de la diapositiva actual
  let currentSlideIndex = 0;

  // Agrega una función para cambiar la diapositiva automáticamente
  function autoChangeSlide() {
    // Obtén el número total de diapositivas
    const numSlides = sliderImages.length;

    // Cambia la diapositiva actual
    currentSlideIndex = (currentSlideIndex + 1) % numSlides;

    // Actualiza la diapositiva actual y la siguiente diapositiva
    mat.uniforms.nextImage.value = sliderImages[currentSlideIndex];
    mat.uniforms.nextImage.needsUpdate = true;

    // Anima la transición
    TweenLite.to(mat.uniforms.dispFactor, 1, {
      value: 1,
      ease: 'Expo.easeInOut',
      onComplete: function() {
        mat.uniforms.currentImage.value = sliderImages[currentSlideIndex];
        mat.uniforms.currentImage.needsUpdate = true;
        mat.uniforms.dispFactor.value = 0.0;
      }
    });

    // Actualiza el botón de paginación activo
    document.getElementById('pagination').querySelectorAll('.active')[0].className = '';
    document.querySelectorAll(`[data-slide="${currentSlideIndex}"]`)[0].className = 'active';

    // Actualiza el título y el estado de la diapositiva
    let slideTitleEl = document.getElementById('slide-title');
    let slideStatusEl = document.getElementById('slide-status');
    let nextSlideTitle = document.querySelectorAll(`[data-slide-title="${currentSlideIndex}"]`)[0].innerHTML;
    let nextSlideStatus = document.querySelectorAll(`[data-slide-status="${currentSlideIndex}"]`)[0].innerHTML;

    TweenLite.fromTo(slideTitleEl, 0.5, {
      autoAlpha: 1,
      filter: 'blur(0px)',
      y: 0
    }, {
      autoAlpha: 0,
      filter: 'blur(10px)',
      y: 20,
      ease: 'Expo.easeIn',
      onComplete: function() {
        slideTitleEl.innerHTML = nextSlideTitle;

        TweenLite.to(slideTitleEl, 0.5, {
          autoAlpha: 1,
          filter: 'blur(0px)',
          y: 0,
        })
      }
    });

    TweenLite.fromTo(slideStatusEl, 0.5, {
      autoAlpha: 1,
      filter: 'blur(0px)',
      y: 0
    }, {
      autoAlpha: 0,
      filter: 'blur(10px)',
      y: 20,
      ease: 'Expo.easeIn',
      onComplete: function() {
        slideStatusEl.innerHTML = nextSlideStatus;

        TweenLite.to(slideStatusEl, 0.5, {
          autoAlpha: 1,
          filter: 'blur(0px)',
          y: 0,
          delay: 0.1,
        })
      }
    });
  };

  // Agrega un temporizador para llamar a la función autoChangeSlide cada 3 segundos
  let autoChangeInterval = setInterval(autoChangeSlide, 5000);

    window.addEventListener( 'resize' , function(e) {
        renderer.setSize(renderW, renderH);
    });

    let animate = function() {
        requestAnimationFrame(animate);
    
        renderer.setSize(newRenderW, newRenderH);
        renderer.render(scene, camera);
      };
      animate();
};

imagesLoaded( document.querySelectorAll('img'), () => {

    document.body.classList.remove('loading');

    const el = document.getElementById('slider');
    const imgs = Array.from(el.querySelectorAll('img'));
    new displacementSlider({
        parent: el,
        images: imgs
    });

});


window.addEventListener('load', function() {
    // Aquí puedes ejecutar el código que deseas
    console.log('El documento ha terminado de cargar');
    document.querySelectorAll('#slider-1, #slider-2, #slider-3').forEach(function(img) {
        img.style.display = 'none';
      });
  });


/* MENU VIDEO */
/* const video = document.querySelector(".video-container video");
const hoverText = document.querySelector(".video-container .hover-text");

video.addEventListener("mouseenter", () => {
  video.play();
  hoverText.classList.remove("active");
});

video.addEventListener("mouseleave", () => {
  video.pause();
  hoverText.classList.add("active");
});

const btn = document.querySelector(".boton");
const text = document.querySelector(".leer-mas");
const wrapper = document.querySelector(".wrapper");

btn.addEventListener("click", e => {
    text.classList.toggle("leer-mas_open");
    text.classList.contains("leer-mas_open") ? btn.innerHTML = "Ver menos" : btn.innerHTML = "Ver más";
}); */

// Para los videos y el texto al pasar el ratón
const videos = document.querySelectorAll(".video-container video");
const hoverTexts = document.querySelectorAll(".video-container .hover-text");

videos.forEach((video, index) => {
    const hoverText = hoverTexts[index]; // Obtener el hoverText correspondiente al video
  
    video.addEventListener("mouseenter", () => {
      video.play();
      hoverText.classList.remove("active");
    });
  
    video.addEventListener("mouseleave", () => {
      video.pause();
      hoverText.classList.add("active");
    });
  
    // Add autoplay attribute for mobile devices
    if (isMobile()) {
      video.setAttribute("autoplay", "");
    }
  });
  
  function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
  }

// Para el botón de "ver más" y "ver menos"
const btns = document.querySelectorAll(".boton");
const texts = document.querySelectorAll(".leer-mas");

btns.forEach((btn, index) => {
  const text = texts[index]; // Obtener el texto correspondiente al botón
  btn.addEventListener("click", () => {
    text.classList.toggle("leer-mas_open");
    btn.innerHTML = text.classList.contains("leer-mas_open") ? "Cerrar alérgenos" : "Alérgenos";
  });
});

  