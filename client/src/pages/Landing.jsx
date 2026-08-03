import React, { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------
// Shared Animation Components
// ---------------------------------------------------------
function WordsPullUp({ text, className, showAsterisk }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const words = text.split(' ');

  return (
    <div ref={ref} className={cn("inline-flex flex-wrap", className)}>
      {words.map((word, i) => (
        <span key={i} className="overflow-hidden inline-block mr-[0.2em] last:mr-0 relative">
          <motion.span
            className="inline-block"
            initial={{ y: 50, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
            {showAsterisk && i === words.length - 1 && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</span>
            )}
          </motion.span>
        </span>
      ))}
    </div>
  );
}

function WordsPullUpMultiStyle({ segments, className }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  let globalWordIndex = 0;

  return (
    <div ref={ref} className={cn("inline-flex flex-wrap justify-center", className)}>
      {segments.map((segment, segIdx) => {
        const words = segment.text.split(' ');
        return words.map((word, wordIdx) => {
          const delay = globalWordIndex * 0.08;
          globalWordIndex++;
          return (
            <span key={`${segIdx}-${wordIdx}`} className="overflow-hidden inline-block mr-[0.2em] last:mr-0 mb-2">
              <motion.span
                className={cn("inline-block", segment.className)}
                initial={{ y: 50, opacity: 0 }}
                animate={isInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
                transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {word}
              </motion.span>
            </span>
          );
        });
      })}
    </div>
  );
}

function AnimatedLetter({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  return <motion.span style={{ opacity }}>{children}</motion.span>;
}

// ---------------------------------------------------------
// Main Landing Page Component
// ---------------------------------------------------------
export default function Landing() {
  const aboutRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: aboutRef,
    offset: ['start 0.8', 'end 0.2']
  });

  const aboutText = "Built from the ground up for software engineers and learners. DEVSPAXE replaces messy text files and disjointed browser tabs with a single, unified environment designed specifically for technical mastery, code execution, and algorithmic thinking.";
  const aboutChars = aboutText.split('');

  const featuresHeader = [
    { text: "Developer-grade workflows for visionary engineers.", className: "text-primary-text" },
    { text: "Built for pure logic. Powered by code.", className: "text-gray-500" }
  ];

  const aboutHeader = [
    { text: "We are DEVSPAXE,", className: "font-normal" },
    { text: "a programmer's notebook.", className: "italic font-serif" },
    { text: "We have tools for concepts, code execution, and data structures.", className: "font-normal" }
  ];

  return (
    <div className="bg-app-bg text-primary-text w-full selection:bg-primary/30">
      {/* SECTION 1: HERO */}
      <section className="h-screen p-4 md:p-6 w-full">
        <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden bg-[#101010]">
          {/* Video Background */}
          <video
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          />
          <div className="absolute inset-0 noise-overlay opacity-[0.7] mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

          {/* Navbar */}
          <div className="absolute top-0 left-0 right-0 flex justify-center z-50">
            <nav className="bg-app-bg rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8 flex items-center gap-3 sm:gap-6 md:gap-12 lg:gap-14">
              <Link to="/" style={{ color: 'rgba(225, 224, 204, 0.8)' }} className="text-[10px] sm:text-xs md:text-sm hover:text-primary-text transition-colors">Features</Link>
              <Link to="/" style={{ color: 'rgba(225, 224, 204, 0.8)' }} className="text-[10px] sm:text-xs md:text-sm hover:text-primary-text transition-colors">About</Link>
              <div className="text-white mx-2"><Code2 size={16} /></div>
              <Link to="/auth" style={{ color: 'rgba(225, 224, 204, 0.8)' }} className="text-[10px] sm:text-xs md:text-sm hover:text-primary-text transition-colors">Log In</Link>
              <Link to="/auth" style={{ color: 'rgba(225, 224, 204, 0.8)' }} className="text-[10px] sm:text-xs md:text-sm hover:text-primary-text transition-colors">Sign Up</Link>
            </nav>
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 lg:p-16">
            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-8">
                <WordsPullUp 
                  text="DEVSPAXE" 
                  showAsterisk={false}
                  className="text-[20vw] sm:text-[18vw] md:text-[16vw] lg:text-[14vw] font-code font-bold leading-[0.85] tracking-[-0.07em] text-primary-text" 
                />
              </div>
              <div className="col-span-12 md:col-span-4 flex flex-col items-start md:items-end md:text-right gap-6 pb-2 md:pb-6">
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="text-primary/70 text-xs sm:text-sm md:text-base leading-[1.2] max-w-sm"
                >
                  DEVSPAXE is a learning-focused programming notebook platform bound not by complex document editors, but by a passion to unlock logic and mastery through clean design and execution.
                </motion.p>
                <Link to="/auth">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="group bg-primary text-black rounded-full pl-6 pr-1 py-1 flex items-center gap-4 hover:gap-6 transition-all duration-300 cursor-pointer"
                  >
                    <span className="font-medium text-sm sm:text-base">Enter workspace</span>
                    <div className="bg-app-bg rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <ArrowRight size={18} className="text-primary" />
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ABOUT */}
      <section className="bg-app-bg py-24 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto bg-[#101010] rounded-[2rem] p-8 md:p-16 text-center shadow-2xl border border-app-border">
          <div className="text-primary text-[10px] sm:text-xs tracking-widest uppercase mb-8 font-medium">Programming Notes</div>
          
          <WordsPullUpMultiStyle 
            segments={aboutHeader} 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-4xl mx-auto leading-[0.95] sm:leading-[0.9] tracking-tight mb-12" 
          />

          <div ref={aboutRef} className="max-w-2xl mx-auto text-[#DEDBC8] text-sm sm:text-base md:text-lg leading-relaxed font-light mt-8">
            {aboutChars.map((char, i) => {
              const charProgress = i / aboutChars.length;
              return (
                <AnimatedLetter 
                  key={i} 
                  progress={scrollYProgress} 
                  range={[charProgress - 0.1, charProgress + 0.05]}
                >
                  {char}
                </AnimatedLetter>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3: FEATURES */}
      <section className="min-h-screen bg-app-bg relative py-24 px-4 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-16">
            <WordsPullUpMultiStyle 
              segments={featuresHeader} 
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal leading-tight flex-col items-start text-left" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-2 md:gap-4 lg:h-[480px]">
            {/* Card 1 */}
            <FeatureCard delay={0}>
              <div className="absolute inset-0">
                <video
                  autoPlay loop muted playsInline
                  className="w-full h-full object-cover"
                  src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
              <div className="relative z-10 mt-auto pt-60">
                <h3 className="text-primary-text text-2xl font-medium tracking-tight">Your creative canvas.</h3>
              </div>
            </FeatureCard>

            {/* Card 2 */}
            <FeatureCard delay={0.15}>
              <div className="bg-[#212121] h-full rounded-2xl p-6 flex flex-col justify-between group cursor-pointer border border-app-border hover:border-app-border-strong transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-12">
                    <img src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85" alt="Icon" className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-black/30 p-2" />
                    <span className="text-gray-500 font-serif text-xl">01</span>
                  </div>
                  <h3 className="text-primary-text text-xl sm:text-2xl font-medium mb-6">Structured Knowledge.</h3>
                  <ul className="space-y-4">
                    <FeatureListItem text="Reusable notebooks & folders" />
                    <FeatureListItem text="Fast, plain-text editor" />
                    <FeatureListItem text="Autosave and sync" />
                    <FeatureListItem text="Instant full-text search" />
                  </ul>
                </div>
                <div className="flex items-center gap-2 text-primary mt-8 group-hover:gap-3 transition-all">
                  <span className="text-sm font-medium">Explore notebooks</span>
                  <ArrowRight size={16} className="-rotate-45" />
                </div>
              </div>
            </FeatureCard>

            {/* Card 3 */}
            <FeatureCard delay={0.3}>
              <div className="bg-[#212121] h-full rounded-2xl p-6 flex flex-col justify-between group cursor-pointer border border-app-border hover:border-app-border-strong transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-12">
                    <img src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85" alt="Icon" className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-black/30 p-2" />
                    <span className="text-gray-500 font-serif text-xl">02</span>
                  </div>
                  <h3 className="text-primary-text text-xl sm:text-2xl font-medium mb-6">Runnable Snippets.</h3>
                  <ul className="space-y-4">
                    <FeatureListItem text="JS, Python, C++ execution" />
                    <FeatureListItem text="HTML/CSS live preview" />
                    <FeatureListItem text="Temporary output panels" />
                  </ul>
                </div>
                <div className="flex items-center gap-2 text-primary mt-8 group-hover:gap-3 transition-all">
                  <span className="text-sm font-medium">Learn more</span>
                  <ArrowRight size={16} className="-rotate-45" />
                </div>
              </div>
            </FeatureCard>

            {/* Card 4 */}
            <FeatureCard delay={0.45}>
              <div className="bg-[#212121] h-full rounded-2xl p-6 flex flex-col justify-between group cursor-pointer border border-app-border hover:border-app-border-strong transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-12">
                    <img src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85" alt="Icon" className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-black/30 p-2" />
                    <span className="text-gray-500 font-serif text-xl">03</span>
                  </div>
                  <h3 className="text-primary-text text-xl sm:text-2xl font-medium mb-6">Diagram Templates.</h3>
                  <ul className="space-y-4">
                    <FeatureListItem text="Pre-made manual sketches" />
                    <FeatureListItem text="Stacks, Queues, Trees" />
                    <FeatureListItem text="Graphs and Linked Lists" />
                  </ul>
                </div>
                <div className="flex items-center gap-2 text-primary mt-8 group-hover:gap-3 transition-all">
                  <span className="text-sm font-medium">View templates</span>
                  <ArrowRight size={16} className="-rotate-45" />
                </div>
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ children, delay }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden bg-[#212121]"
    >
      {children}
    </motion.div>
  );
}

function FeatureListItem({ text }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-1 flex-shrink-0">
        <Check size={16} className="text-primary" />
      </div>
      <span className="text-gray-400 text-sm leading-tight">{text}</span>
    </li>
  );
}
