import { useState, useRef, useEffect } from 'react';
import { Volume2, MessageSquare, HelpCircle, Award, PlayCircle, Menu, X, Headphones, Sliders, Settings, Info, Upload, Play, Pause, SkipBack, ChevronUp, ChevronDown, Music } from 'lucide-react';

export default function InEarMonitorApp() {
  const [activeTab, setActiveTab] = useState('learn');
  const [activeTopic, setActiveTopic] = useState('intro');
  const [showMenu, setShowMenu] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const [sliderValues, setSliderValues] = useState({
    vocals: 75,
    click: 70,
    md: 65,
    drums: 60,
    bass: 60,
    keys: 55,
    leadVocals: 60,
    backgroundVocals: 50,
    acousticGuitar: 55,
    electricGuitar: 50,
    electricGuitar2: 50,
    percussion: 45,
    synth: 45,
    tracks: 40,
    master: 65
  });
  
  const [panning, setPanning] = useState({
    vocals: 0,
    click: 0,
    md: 0,
    drums: 0,
    bass: 0,
    keys: -30,
    leadVocals: 20,
    backgroundVocals: -20,
    acousticGuitar: 40,
    electricGuitar: -40,
    electricGuitar2: 40,
    percussion: 30,
    synth: -30,
    tracks: 0
  });

  const [activeChannel, setActiveChannel] = useState(null);
  const [audioFiles, setAudioFiles] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const audioElements = useRef({});
  const masterGainNode = useRef(null);
  const audioContext = useRef(null);
  const gainNodes = useRef({});
  const panNodes = useRef({});
  const animationRef = useRef(null);
  const seekBarRef = useRef(null);
  const audioSources = useRef({});
  
  // Add quiz state
  const [quizAnswers, setQuizAnswers] = useState({
    q1: '',
    q2: '',
    q3: ''
  });
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  
  // Initialize Web Audio API context
  useEffect(() => {
    if (Object.keys(audioFiles).length > 0) {
      // Create audio context if it doesn't exist
      if (!audioContext.current) {
        try {
          audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
          console.log("Audio context created:", audioContext.current.state);
          masterGainNode.current = audioContext.current.createGain();
          masterGainNode.current.connect(audioContext.current.destination);
          masterGainNode.current.gain.value = sliderValues.master / 100;
        } catch (err) {
          console.error("Error creating audio context:", err);
        }
      }
      
      // Create audio nodes for each track
      Object.keys(audioFiles).forEach(channel => {
        try {
          if (!audioElements.current[channel]) {
            const audio = new Audio();
            audio.src = URL.createObjectURL(audioFiles[channel]);
            audio.preload = 'auto';
            audio.loop = isLooping;
            audioElements.current[channel] = audio;
            
            console.log(`Creating audio for ${channel}:`, audio.src);
            
            // Connect to Web Audio API
            const source = audioContext.current.createMediaElementSource(audio);
            const gainNode = audioContext.current.createGain();
            const panNode = audioContext.current.createStereoPanner();
            
            // Store source node
            audioSources.current[channel] = source;
            
            // Connect nodes: source -> gain -> pan -> master -> destination
            source.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(masterGainNode.current);
            
            // Set initial values
            gainNode.gain.value = sliderValues[channel] / 100;
            panNode.pan.value = panning[channel] / 100;
            
            // Store nodes for later access
            gainNodes.current[channel] = gainNode;
            panNodes.current[channel] = panNode;
            
            // Set up event listeners for the first audio to track timing
            audio.addEventListener('loadedmetadata', () => {
              console.log(`Audio ${channel} metadata loaded, duration:`, audio.duration);
              setDuration(audio.duration);
            });
            
            audio.addEventListener('ended', () => {
              console.log(`Audio ${channel} ended`);
              if (!isLooping) {
                setIsPlaying(false);
                cancelAnimationFrame(animationRef.current);
              }
            });
            
            audio.addEventListener('error', (e) => {
              console.error(`Error with audio ${channel}:`, e);
            });
          }
        } catch (err) {
          console.error(`Error setting up audio for ${channel}:`, err);
        }
      });
    }
    
    return () => {
      // Cleanup
      if (audioContext.current) {
        Object.values(audioElements.current).forEach(audio => {
          try {
            audio.pause();
            audio.src = '';
          } catch (e) {
            console.error("Error cleaning up audio:", e);
          }
        });
      }
    };
  }, [audioFiles, isLooping]);
  
  // Update gain and pan values when sliders change
  useEffect(() => {
    if (masterGainNode.current) {
      masterGainNode.current.gain.value = sliderValues.master / 100;
      console.log("Master gain updated:", sliderValues.master / 100);
    }
    
    Object.keys(gainNodes.current).forEach(channel => {
      if (gainNodes.current[channel]) {
        gainNodes.current[channel].gain.value = sliderValues[channel] / 100;
      }
    });
  }, [sliderValues]);
  
  useEffect(() => {
    Object.keys(panNodes.current).forEach(channel => {
      if (panNodes.current[channel]) {
        panNodes.current[channel].pan.value = panning[channel] / 100;
      }
    });
  }, [panning]);
  
  const handleFileUpload = (channel, e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      console.log(`File uploaded for ${channel}:`, file.name);
      setAudioFiles(prev => ({
        ...prev,
        [channel]: file
      }));
    } else {
      console.error("Invalid file type:", file ? file.type : "no file");
    }
  };
  
  const playPause = () => {
    if (Object.keys(audioElements.current).length === 0) {
      console.log("No audio elements to play");
      return;
    }
    
    if (isPlaying) {
      console.log("Pausing all tracks");
      // Pause all tracks
      Object.values(audioElements.current).forEach(audio => {
        audio.pause();
      });
      cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
    } else {
      console.log("Playing all tracks");
      
      // Resume audio context if suspended (important for browsers with autoplay restrictions)
      if (audioContext.current && audioContext.current.state === 'suspended') {
        console.log("Resuming audio context");
        audioContext.current.resume().then(() => {
          console.log("AudioContext resumed successfully");
        }).catch(error => {
          console.error("Failed to resume AudioContext:", error);
        });
      }
      
      // Get the time from the first track to sync all tracks
      const firstAudio = audioElements.current[Object.keys(audioElements.current)[0]];
      const startTime = firstAudio.currentTime;
      console.log("Starting playback at time:", startTime);
      
      // Play all tracks synchronized
      const promises = Object.values(audioElements.current).map(audio => {
        audio.currentTime = startTime;
        return audio.play().catch(error => {
          console.error("Error playing audio:", error);
        });
      });
      
      Promise.all(promises)
        .then(() => {
          console.log("All audio tracks started successfully");
          setIsPlaying(true);
          
          // Animation for seek bar
          const updateSeekBar = () => {
            const firstAudio = audioElements.current[Object.keys(audioElements.current)[0]];
            setCurrentTime(firstAudio.currentTime);
            animationRef.current = requestAnimationFrame(updateSeekBar);
          };
          
          animationRef.current = requestAnimationFrame(updateSeekBar);
        })
        .catch(error => {
          console.error("Could not play all tracks:", error);
        });
    }
  };
  
  const handleSeekChange = (e) => {
    const newTime = parseFloat(e.target.value);
    console.log("Seeking to time:", newTime);
    Object.values(audioElements.current).forEach(audio => {
      audio.currentTime = newTime;
    });
    setCurrentTime(newTime);
  };
  
  const resetPlayback = () => {
    console.log("Resetting playback");
    Object.values(audioElements.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setCurrentTime(0);
    setIsPlaying(false);
    cancelAnimationFrame(animationRef.current);
  };
  
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  
  const handleSliderChange = (channel, value) => {
    setSliderValues(prev => ({
      ...prev,
      [channel]: parseInt(value)
    }));
  };
  
  const handlePanningChange = (channel, value) => {
    setPanning(prev => ({
      ...prev,
      [channel]: parseInt(value)
    }));
  };
  
  const learningTopics = [
    { id: 'intro', title: 'Introduction', icon: <Info /> },
    { id: 'equipment', title: 'In-Ear Monitor Basics', icon: <Headphones /> },
    { id: 'mixing', title: 'Mixing Fundamentals', icon: <Sliders /> },
    { id: 'buildingMix', title: 'Building a Good Mix', icon: <Volume2 /> },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: <HelpCircle /> },
  ];
  
  const topicContent = {
    intro: {
      title: 'Welcome to In-Ear Monitor Training',
      content: (
        <div>
          <p className="mb-4">This app will help you learn best practices for mixing your own in-ear monitors.</p>
          <p className="mb-4">By the end of this training, you'll feel well equipped and confident when mixing, whether you're a new or seasoned team member.</p>
          <div className="bg-blue-100 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">What you'll learn:</h3>
            <ul className="list-disc pl-5">
              <li>In-ear monitor basics and best practices</li>
              <li>How to create an effective mix</li>
              <li>Channel prioritization and mix building</li>
              <li>Troubleshooting common issues</li>
            </ul>
          </div>
          <button 
            className="bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-blue-700 transition-colors" 
            onClick={() => setActiveTopic('equipment')}
          >
            <PlayCircle className="mr-2" size={18} />
            Start Training
          </button>
        </div>
      )
    },
    equipment: {
      title: 'In-Ear Monitor Basics',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Finding the Right Fit</h3>
          <p className="mb-4">A proper fit is crucial for quality monitoring. A snug fit will:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>Prevent your in-ears from falling out</li>
            <li>Provide clearer and more precise sound</li>
            <li>Help you hear the full frequency range (especially bass)</li>
            <li>Allow you to monitor at safer volume levels</li>
          </ul>
          
          <div className="bg-yellow-100 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">Recommendation:</h3>
            <p>Consider investing in custom in-ear monitors. Though pricier, they:</p>
            <ul className="list-disc pl-5">
              <li>Fit your ears perfectly</li>
              <li>Provide better noise isolation</li>
              <li>Typically have higher quality drivers</li>
              <li>Enable clearer detail and better overall tone</li>
            </ul>
          </div>
          
          <div className="flex justify-between mt-6">
            <button 
              className="bg-gray-500 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-600 transition-colors"
              onClick={() => setActiveTopic('intro')}
            >
              Previous
            </button>
            <button 
              className="bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
              onClick={() => setActiveTopic('mixing')}
            >
              Next
            </button>
          </div>
        </div>
      )
    },
    mixing: {
      title: 'Mixing Fundamentals',
      content: (
        <div>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">The Busy Mix</h3>
            <div className="bg-red-100 p-3 rounded-md mb-4">
              <p>Having everything cranked up doesn't mean you have a good mix!</p>
            </div>
            <p className="mb-4">When everything is at the same volume level, you create a chaotic, fatiguing mix that doesn't highlight what's important.</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-2">The Minimal Mix</h3>
            <div className="bg-orange-100 p-3 rounded-md mb-4">
              <p>Using only a few channels isn't effective either.</p>
            </div>
            <p className="mb-4">While "just myself, drums and click" might seem simpler, you'll miss important musical cues and won't be properly connected with your team.</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-2">The Good Mix</h3>
            <div className="bg-green-100 p-3 rounded-md mb-4">
              <p>A balanced mix with proper priorities creates clarity and musicality.</p>
            </div>
            <p className="mb-4">Start with a master volume between 50-75% to give yourself headroom. Prioritize channels according to your role.</p>
          </div>
          
          <div className="flex justify-between mt-6">
            <button 
              className="bg-gray-500 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-600 transition-colors"
              onClick={() => setActiveTopic('equipment')}
            >
              Previous
            </button>
            <button 
              className="bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
              onClick={() => setActiveTopic('buildingMix')}
            >
              Next
            </button>
          </div>
        </div>
      )
    },
    buildingMix: {
      title: 'Building a Good Mix',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Start With Yourself</h3>
          <p className="mb-4">Begin with your own voice or instrument at a comfortable, present level. This forms the foundation of your mix.</p>
          
          <h3 className="font-semibold mb-2">Prioritize Your Channels</h3>
          <p className="mb-4">For vocalists, here's a recommended priority order:</p>
          <ol className="list-decimal pl-5 mb-4">
            <li>Your voice</li>
            <li>Click</li>
            <li>Music Director</li>
            <li>Pastor/Speaker Mic</li>
            <li>Drums</li>
            <li>Bass</li>
            <li>Piano/Keys</li>
            <li>Lead vocalists</li>
            <li>Other vocalists</li>
            <li>Acoustic Guitar</li>
            <li>Electric Guitar</li>
            <li>Percussion</li>
            <li>Keys 2/Synth</li>
            <li>Tracks</li>
          </ol>
          
          <h3 className="font-semibold mb-2">Use Panning</h3>
          <p className="mb-4">Panning instruments in the stereo field creates space and separation without adjusting volume. This helps distinguish similar instruments and creates a more natural sound.</p>
          
          <div className="bg-blue-100 p-3 rounded-md mb-4">
            <p>Example: Pan two acoustic guitars - one left and one right - to hear both clearly without them competing for the same space.</p>
          </div>
          
          <div className="flex justify-between mt-6">
            <button 
              className="bg-gray-500 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-600 transition-colors"
              onClick={() => setActiveTopic('mixing')}
            >
              Previous
            </button>
            <button 
              className="bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
              onClick={() => setActiveTopic('troubleshooting')}
            >
              Next
            </button>
          </div>
        </div>
      )
    },
    troubleshooting: {
      title: 'Troubleshooting',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Common Issues & Solutions</h3>
          
          <div className="mb-4">
            <h4 className="font-medium text-blue-700">ME-1 Users</h4>
            <p className="pl-4">Missing channels on device? Communicate with audio engineer or nearest tech.</p>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-blue-700">Wireless Pack Users</h4>
            <ul className="list-disc pl-8">
              <li><strong>Mix not changing?</strong> 
                <ul className="pl-4">
                  <li>Verify you have the right pack or iPad</li>
                  <li>Ensure iPad mixing account corresponds with your pack</li>
                </ul>
              </li>
              <li><strong>Signal Dropouts?</strong> 
                <ul className="pl-4">
                  <li>Check that the antenna is attached properly</li>
                </ul>
              </li>
            </ul>
          </div>
          
          <div className="mb-4">
            <h4 className="font-medium text-blue-700">Vocalists</h4>
            <ul className="list-disc pl-8">
              <li><strong>Mix not changing when checking mic?</strong> 
                <ul className="pl-4">
                  <li>Verify you have the right wireless mic</li>
                </ul>
              </li>
              <li><strong>Not hearing clearly?</strong> 
                <ul className="pl-4">
                  <li>Ensure all cables are fully attached</li>
                </ul>
              </li>
              <li><strong>Earbuds falling out?</strong> 
                <ul className="pl-4">
                  <li>Try larger buds</li>
                </ul>
              </li>
              <li><strong>One earbud not working?</strong> 
                <ul className="pl-4">
                  <li>Check that the in-ear is properly attached to the cable</li>
                </ul>
              </li>
            </ul>
          </div>
          
          <div className="bg-blue-100 p-3 rounded-md mb-4">
            <p className="font-semibold">For all other technical needs, communicate with your Tech Team.</p>
          </div>
          
          <div className="flex justify-between mt-6">
            <button 
              className="bg-gray-500 text-white py-2 px-4 rounded-lg flex items-center hover:bg-gray-600 transition-colors"
              onClick={() => setActiveTopic('buildingMix')}
            >
              Previous
            </button>
            <button 
              className="bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center hover:bg-blue-700 transition-colors"
              onClick={() => setActiveTab('simulator')}
            >
              Try the Simulator
            </button>
          </div>
        </div>
      )
    },
  };

  // Group channels by type for better organization
  const channelGroups = {
    vocals: ['vocals', 'leadVocals', 'backgroundVocals'],
    rhythm: ['drums', 'bass', 'acousticGuitar', 'electricGuitar', 'electricGuitar2'],
    melodic: ['keys', 'synth'],
    utility: ['click', 'md', 'tracks', 'percussion']
  };

  // Enhance the channel labels with emojis for visual cues
  const channelLabels = {
    vocals: "🎤 Lead Vocals",
    click: "🎯 Click Track",
    md: "🎼 Metronome",
    drums: "🥁 Drums",
    bass: "🎸 Bass Guitar",
    keys: "🎹 Keyboards",
    leadVocals: "🎤 Lead Vocals",
    backgroundVocals: "🎤 Background Vocals",
    acousticGuitar: "🪕 Acoustic Guitar",
    electricGuitar: "🎸 Electric Guitar 1",
    electricGuitar2: "🎸 Electric Guitar 2",
    percussion: "🪘 Percussion",
    synth: "🎛️ Synth",
    tracks: "💿 Backing Tracks"
  };

  // Get color for channel based on type
  const getChannelColor = (channel) => {
    if (channelGroups.vocals.includes(channel)) return 'blue';
    if (channelGroups.rhythm.includes(channel)) return 'green';
    if (channelGroups.melodic.includes(channel)) return 'purple';
    if (channelGroups.utility.includes(channel)) return 'orange';
    return 'gray';
  };

  // Get volume color with improved visual feedback
  const getVolumeColor = (value) => {
    if (value > 85) return 'bg-red-500';
    if (value > 70) return 'bg-yellow-500';
    if (value > 50) return 'bg-green-500';
    return 'bg-blue-400';
  };

  // Determine if channel is clipping
  const isClipping = (channel) => {
    return sliderValues[channel] > 85 || 
      (sliderValues.master > 75 && sliderValues[channel] > 70);
  };
  
  // Add function to handle quiz answers
  const handleQuizAnswer = (question, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [question]: answer
    }));
  };
  
  // Add function to check quiz answers
  const checkQuizAnswers = () => {
    let score = 0;
    
    // Correct answers
    if (quizAnswers.q1 === 'b') score += 1;
    if (quizAnswers.q2 === 'b') score += 1;
    if (quizAnswers.q3 === 'b') score += 1;
    
    setQuizScore(score);
    setQuizSubmitted(true);
  };
  
  // Add toggle loop function
  const toggleLoop = () => {
    setIsLooping(!isLooping);
    Object.values(audioElements.current).forEach(audio => {
      audio.loop = !isLooping;
    });
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header - Enhanced with gradient and better styling */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-white text-blue-700 p-2 rounded-full mr-3">
            <Headphones className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold">In-Ear Monitor Training</h1>
        </div>
        <button 
          className="md:hidden bg-blue-800 hover:bg-blue-900 p-2 rounded-full transition-colors"
          onClick={() => setShowMenu(!showMenu)}
        >
          {showMenu ? <X /> : <Menu />}
        </button>
      </header>
      
      {/* Mobile Menu - Enhanced with better styling */}
      {showMenu && (
        <div className="md:hidden bg-blue-800 text-white shadow-lg z-10 relative">
          <div 
            className={`p-4 flex items-center ${activeTab === 'learn' ? 'bg-blue-900 border-l-4 border-white' : 'hover:bg-blue-700'}`}
            onClick={() => {setActiveTab('learn'); setShowMenu(false);}}
          >
            <Info className="mr-3" size={18} />
            <span className="font-medium">Learn</span>
          </div>
          <div 
            className={`p-4 flex items-center ${activeTab === 'simulator' ? 'bg-blue-900 border-l-4 border-white' : 'hover:bg-blue-700'}`}
            onClick={() => {setActiveTab('simulator'); setShowMenu(false);}}
          >
            <Sliders className="mr-3" size={18} />
            <span className="font-medium">Simulator</span>
          </div>
          <div 
            className={`p-4 flex items-center ${activeTab === 'quiz' ? 'bg-blue-900 border-l-4 border-white' : 'hover:bg-blue-700'}`}
            onClick={() => {setActiveTab('quiz'); setShowMenu(false);}}
          >
            <Award className="mr-3" size={18} />
            <span className="font-medium">Quiz</span>
          </div>
          <div 
            className={`p-4 flex items-center ${activeTab === 'help' ? 'bg-blue-900 border-l-4 border-white' : 'hover:bg-blue-700'}`}
            onClick={() => {setActiveTab('help'); setShowMenu(false);}}
          >
            <MessageSquare className="mr-3" size={18} />
            <span className="font-medium">Help</span>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on mobile, enhanced with better styling */}
        <div className="hidden md:flex md:w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white flex-col shadow-xl">
          <div className="p-4 border-b border-gray-700 mb-4">
            <h2 className="font-bold text-lg">Navigation</h2>
          </div>
          <div 
            className={`mx-3 mb-2 p-3 flex items-center rounded-lg cursor-pointer transition-all ${activeTab === 'learn' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveTab('learn')}
          >
            <Info className="mr-3" size={20} />
            <span className="font-medium">Learn</span>
          </div>
          <div 
            className={`mx-3 mb-2 p-3 flex items-center rounded-lg cursor-pointer transition-all ${activeTab === 'simulator' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveTab('simulator')}
          >
            <Sliders className="mr-3" size={20} />
            <span className="font-medium">Mix Simulator</span>
          </div>
          <div 
            className={`mx-3 mb-2 p-3 flex items-center rounded-lg cursor-pointer transition-all ${activeTab === 'quiz' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveTab('quiz')}
          >
            <Award className="mr-3" size={20} />
            <span className="font-medium">Quiz</span>
          </div>
          <div 
            className={`mx-3 mb-2 p-3 flex items-center rounded-lg cursor-pointer transition-all ${activeTab === 'help' ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-700'}`}
            onClick={() => setActiveTab('help')}
          >
            <MessageSquare className="mr-3" size={20} />
            <span className="font-medium">Help</span>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {activeTab === 'learn' && (
            <div className="p-6">
              <div className="flex mb-6 overflow-x-auto pb-2">
                {learningTopics.map((topic) => (
                  <div 
                    key={topic.id}
                    className={`flex items-center whitespace-nowrap mr-4 p-2 rounded-lg cursor-pointer transition-colors ${activeTopic === topic.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    onClick={() => setActiveTopic(topic.id)}
                  >
                    <span className="mr-2">{topic.icon}</span>
                    <span>{topic.title}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow text-gray-800">
                <h2 className="text-2xl font-bold mb-4">{topicContent[activeTopic].title}</h2>
                {topicContent[activeTopic].content}
              </div>
            </div>
          )}
          
          {activeTab === 'simulator' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <Sliders className="mr-2" /> Mix Simulator
              </h2>
              
              {/* Master Volume - Enhanced with better visual feedback */}
              <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-blue-600">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold flex items-center text-gray-800">
                    <Volume2 className="mr-2 text-blue-600" />
                    Master Volume
                  </h3>
                  <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${sliderValues.master > 75 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {sliderValues.master > 75 ? 'Too High!' : 'Good Level'}
                  </div>
                </div>
                
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sliderValues.master}
                    onChange={(e) => handleSliderChange('master', e.target.value)}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="absolute -bottom-6 left-0 w-full flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <span className={`text-2xl font-bold ${sliderValues.master > 75 ? 'text-red-600' : 'text-blue-600'}`}>
                    {sliderValues.master}%
                  </span>
                </div>
              </div>
              
              {/* Audio Player Controls - Enhanced with better styling */}
              {Object.keys(audioFiles).length > 0 && (
                <div className="bg-white rounded-lg p-6 shadow-md mb-8 text-gray-800">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Music className="mr-2 text-purple-600" />
                    Audio Playback
                  </h3>
                  
                  <div className="flex flex-col md:flex-row items-center mb-4">
                    <div className="flex space-x-3 mb-4 md:mb-0 md:mr-6">
                      <button 
                        className={`p-3 rounded-full shadow-md transition-all transform hover:scale-105 ${isPlaying ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}
                        onClick={playPause}
                      >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                      </button>
                      
                      <button 
                        className="bg-gray-200 text-gray-700 p-3 rounded-full shadow-md hover:bg-gray-300 transition-all transform hover:scale-105"
                        onClick={resetPlayback}
                      >
                        <SkipBack size={24} />
                      </button>

                      <button 
                        className={`p-3 rounded-full shadow-md transition-all transform hover:scale-105 ${isLooping ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                        onClick={toggleLoop}
                        title="Toggle Loop"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                          <path d="M3 3v5h5"/>
                          <path d="M21 12a9 9 0 1 1-9 9 9.75 9.75 0 0 1 6.74-2.74L21 16"/>
                          <path d="M16 16h5v5"/>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex-1 flex items-center w-full">
                      <span className="mr-3 text-sm font-mono">{formatTime(currentTime)}</span>
                      <div className="flex-1 relative">
                        <input 
                          ref={seekBarRef}
                          type="range"
                          min="0"
                          max={duration || 100}
                          value={currentTime}
                          onChange={handleSeekChange}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="absolute -bottom-5 w-full flex justify-between">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                      </div>
                      <span className="ml-3 text-sm font-mono">{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Audio Upload Section - Now Collapsible with better styling */}
              <div className="bg-white rounded-lg p-6 shadow-md mb-8 border-l-4 border-green-500 text-gray-800">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer" 
                  onClick={() => setShowUploadSection(!showUploadSection)}
                >
                  <h3 className="text-xl font-semibold flex items-center">
                    <Upload className="mr-2 text-green-600" />
                    Audio Track Upload
                  </h3>
                  <button className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors">
                    {showUploadSection ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>
                
                {showUploadSection && (
                  <>
                    <p className="mb-6 text-gray-600">Upload audio stems to practice your mixing skills. Upload multiple tracks to create a full mix.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {['vocals', 'drums', 'bass', 'keys', 'acousticGuitar', 'electricGuitar', 'electricGuitar2', 'percussion', 'synth'].map(channel => (
                        <div key={channel} className={`border rounded-lg p-4 transition-all hover:shadow-md border-l-4 ${getChannelColor(channel) === 'blue' ? 'border-l-blue-500' : getChannelColor(channel) === 'green' ? 'border-l-green-500' : getChannelColor(channel) === 'purple' ? 'border-l-purple-500' : 'border-l-orange-500'}`}>
                          <h4 className="font-medium mb-3 text-gray-800">{channelLabels[channel] || channel}</h4>
                          <div className="flex items-center">
                            <label className={`flex items-center justify-center px-4 py-2 rounded-md cursor-pointer transition-colors ${audioFiles[channel] ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>
                              <Upload size={16} className="mr-2" />
                              <span>{audioFiles[channel] ? 'Change' : 'Upload'}</span>
                              <input 
                                type="file" 
                                accept="audio/*" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(channel, e)} 
                              />
                            </label>
                            {audioFiles[channel] && (
                              <span className="ml-2 text-sm text-gray-500 truncate max-w-xs">
                                {audioFiles[channel].name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {Object.keys(audioFiles).length > 0 && (
                      <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm border border-blue-200">
                        <p className="font-medium text-blue-800 mb-2">Tips for Using Uploaded Audio:</p>
                        <ul className="list-disc pl-5 text-blue-700 space-y-1">
                          <li>Adjust the sliders below to mix your tracks</li>
                          <li>Use the playback controls to listen to your mix</li>
                          <li>Try different panning positions for better separation</li>
                          <li>Keep your master volume in the optimal range (50-75%)</li>
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Channel Mix - Enhanced with grouping and better visual hierarchy */}
              <div className="bg-white rounded-lg p-6 shadow-md text-gray-800">
                <h3 className="text-xl font-semibold mb-6 flex items-center">
                  <Sliders className="mr-2 text-indigo-600" />
                  Channel Mix
                </h3>
                
                {/* Group channels by type */}
                {Object.entries(channelGroups).map(([groupName, channels]) => {
                  const hasChannels = channels.some(channel => Object.keys(sliderValues).includes(channel));
                  if (!hasChannels) return null;
                  
                  return (
                    <div key={groupName} className="mb-8">
                      <h4 className="text-lg font-medium mb-4 text-gray-700 capitalize border-b pb-2">
                        {groupName === 'vocals' ? '🎤 Vocals' : 
                         groupName === 'rhythm' ? '🥁 Rhythm Section' : 
                         groupName === 'melodic' ? '🎹 Melodic Instruments' : '🎯 Utility'}
                      </h4>
                      
                      <div className="flex flex-col space-y-4">
                        {channels
                          .filter(channel => Object.keys(sliderValues).includes(channel) && channel !== 'master')
                          .map((channel) => {
                            const borderColor = getChannelColor(channel) === 'blue' ? 'border-blue-400' : 
                                               getChannelColor(channel) === 'green' ? 'border-green-400' : 
                                               getChannelColor(channel) === 'purple' ? 'border-purple-400' : 
                                               'border-orange-400';
                            
                            return (
                              <div 
                                key={channel} 
                                className={`border rounded-lg p-4 transition-all hover:shadow-md ${activeChannel === channel ? 'border-blue-500 bg-blue-50' : `${borderColor} hover:border-gray-300`}`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="font-medium text-gray-800">{channelLabels[channel] || channel.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
                                  <div className="flex items-center">
                                    {isClipping(channel) && (
                                      <span className="text-red-600 mr-2 font-bold text-sm animate-pulse">
                                        CLIPPING!
                                      </span>
                                    )}
                                    <button 
                                      className={`px-3 py-1 rounded-md text-sm transition-colors ${activeChannel === channel ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                                      onClick={() => setActiveChannel(activeChannel === channel ? null : channel)}
                                    >
                                      {activeChannel === channel ? 'Done' : 'Adjust'}
                                    </button>
                                  </div>
                                </div>
                                
                                {activeChannel === channel ? (
                                  <div className="space-y-6 mt-4">
                                    <div>
                                      <label className="block text-sm text-gray-500 mb-2 flex justify-between">
                                        <span>Volume</span>
                                        <span className={isClipping(channel) ? 'text-red-600 font-bold' : ''}>
                                          {sliderValues[channel]}%
                                        </span>
                                      </label>
                                      <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={sliderValues[channel]}
                                        onChange={(e) => handleSliderChange(channel, e.target.value)}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>0%</span>
                                        <span>50%</span>
                                        <span>100%</span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm text-gray-500 mb-2 flex justify-between">
                                        <span>Panning</span>
                                        <span>{panning[channel] === 0 ? 'Center' : panning[channel] < 0 ? `${Math.abs(panning[channel])}% L` : `${panning[channel]}% R`}</span>
                                      </label>
                                      <input 
                                        type="range" 
                                        min="-100" 
                                        max="100" 
                                        value={panning[channel]}
                                        onChange={(e) => handlePanningChange(channel, e.target.value)}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                      />
                                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                                        <span>L</span>
                                        <span>C</span>
                                        <span>R</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center mt-2">
                                    <div className="w-16 text-center text-sm mr-2 bg-gray-100 rounded-full py-1 px-2">
                                      {panning[channel] < 0 ? `${Math.abs(panning[channel])}L` : panning[channel] > 0 ? `${panning[channel]}R` : 'C'}
                                    </div>
                                    <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${getVolumeColor(sliderValues[channel])} transition-all`}
                                        style={{ width: `${sliderValues[channel]}%` }}
                                      ></div>
                                    </div>
                                    <div className="w-12 text-right text-sm ml-2 font-medium">
                                      {sliderValues[channel]}%
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {activeTab === 'quiz' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Knowledge Check</h2>
              <div className="bg-white rounded-lg p-6 shadow text-gray-800">
                {quizSubmitted ? (
                  <div>
                    <div className={`text-center p-4 rounded-lg mb-6 ${quizScore === 3 ? 'bg-green-100 text-green-800' : quizScore >= 1 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      <h3 className="text-xl font-bold mb-2">Your Score: {quizScore}/3</h3>
                      <p>{quizScore === 3 ? 'Great job! You understand in-ear monitor mixing concepts well!' : 
                         quizScore >= 1 ? 'Good effort! Review the learning materials to improve your understanding.' : 
                         'You might want to review the learning materials again.'}</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className={`border rounded-lg p-4 ${quizAnswers.q1 === 'b' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                        <h3 className="font-semibold mb-2">1. What is the recommended master volume range?</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input type="radio" id="q1a" name="q1" checked={quizAnswers.q1 === 'a'} disabled className="mr-2" />
                            <label htmlFor="q1a" className={quizAnswers.q1 === 'a' ? 'text-red-600' : ''}>25% to 50%</label>
                          </div>
                          <div className="flex items-center">
                            <input type="radio" id="q1b" name="q1" checked={quizAnswers.q1 === 'b'} disabled className="mr-2" />
                            <label htmlFor="q1b" className="font-bold text-green-600">50% to 75% (Correct)</label>
                          </div>
                          <div className="flex items-center">
                            <input type="radio" id="q1c" name="q1" checked={quizAnswers.q1 === 'c'} disabled className="mr-2" />
                            <label htmlFor="q1c" className={quizAnswers.q1 === 'c' ? 'text-red-600' : ''}>75% to 100%</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`border rounded-lg p-4 ${quizAnswers.q2 === 'b' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                        <h3 className="font-semibold mb-2">2. What should you start with when building a mix?</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input type="radio" id="q2a" name="q2" checked={quizAnswers.q2 === 'a'} disabled className="mr-2" />
                            <label htmlFor="q2a" className={quizAnswers.q2 === 'a' ? 'text-red-600' : ''}>Drums</label>
                          </div>
                          <div className="flex items-center">
                            <input type="radio" id="q2b" name="q2" checked={quizAnswers.q2 === 'b'} disabled className="mr-2" />
                            <label htmlFor="q2b" className="font-bold text-green-600">Your own voice/instrument (Correct)</label>
                          </div>
                          <div className="flex items-center">
                            <input type="radio" id="q2c" name="q2" checked={quizAnswers.q2 === 'c'} disabled className="mr-2" />
                            <label htmlFor="q2c" className={quizAnswers.q2 === 'c' ? 'text-red-600' : ''}>Click track</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`border rounded-lg p-4 ${quizAnswers.q3 === 'b' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                        <h3 className="font-semibold mb-2">3. What is panning used for?</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input type="radio" id="q3a" name="q3" checked={quizAnswers.q3 === 'a'} disabled className="mr-2" />
                            <label htmlFor="q3a" className={quizAnswers.q3 === 'a' ? 'text-red-600' : ''}>To make everything louder</label>
                          </div>
                          <div className="flex items-center">
                            <input type="radio" id="q3b" name="q3" checked={quizAnswers.q3 === 'b'} disabled className="mr-2" />
                            <label htmlFor="q3b" className="font-bold text-green-600">To position sounds in the stereo field and create separation (Correct)</label>
                          </div>
                          <div className="flex items-center">
                            <input type="radio" id="q3c" name="q3" checked={quizAnswers.q3 === 'c'} disabled className="mr-2" />
                            <label htmlFor="q3c" className={quizAnswers.q3 === 'c' ? 'text-red-600' : ''}>To mute channels you don't want to hear</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <button 
                          className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                          onClick={() => {
                            setQuizSubmitted(false);
                            setQuizAnswers({q1: '', q2: '', q3: ''});
                          }}
                        >
                          Try Again
                        </button>
                        <button 
                          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                          onClick={() => setActiveTab('learn')}
                        >
                          Review Learning Material
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-500 italic mb-4">Test your understanding of in-ear monitor mixing concepts.</p>
                    
                    <div className="space-y-6">
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <h3 className="font-semibold mb-2">1. What is the recommended master volume range?</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q1a" 
                              name="q1" 
                              className="mr-2" 
                              checked={quizAnswers.q1 === 'a'}
                              onChange={() => handleQuizAnswer('q1', 'a')}
                            />
                            <label htmlFor="q1a">25% to 50%</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q1b" 
                              name="q1" 
                              className="mr-2"
                              checked={quizAnswers.q1 === 'b'}
                              onChange={() => handleQuizAnswer('q1', 'b')}
                            />
                            <label htmlFor="q1b">50% to 75%</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q1c" 
                              name="q1" 
                              className="mr-2"
                              checked={quizAnswers.q1 === 'c'}
                              onChange={() => handleQuizAnswer('q1', 'c')}
                            />
                            <label htmlFor="q1c">75% to 100%</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <h3 className="font-semibold mb-2">2. What should you start with when building a mix?</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q2a" 
                              name="q2" 
                              className="mr-2"
                              checked={quizAnswers.q2 === 'a'}
                              onChange={() => handleQuizAnswer('q2', 'a')}
                            />
                            <label htmlFor="q2a">Drums</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q2b" 
                              name="q2" 
                              className="mr-2"
                              checked={quizAnswers.q2 === 'b'}
                              onChange={() => handleQuizAnswer('q2', 'b')}
                            />
                            <label htmlFor="q2b">Your own voice/instrument</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q2c" 
                              name="q2" 
                              className="mr-2"
                              checked={quizAnswers.q2 === 'c'}
                              onChange={() => handleQuizAnswer('q2', 'c')}
                            />
                            <label htmlFor="q2c">Click track</label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <h3 className="font-semibold mb-2">3. What is panning used for?</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q3a" 
                              name="q3" 
                              className="mr-2"
                              checked={quizAnswers.q3 === 'a'}
                              onChange={() => handleQuizAnswer('q3', 'a')}
                            />
                            <label htmlFor="q3a">To make everything louder</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q3b" 
                              name="q3" 
                              className="mr-2"
                              checked={quizAnswers.q3 === 'b'}
                              onChange={() => handleQuizAnswer('q3', 'b')}
                            />
                            <label htmlFor="q3b">To position sounds in the stereo field and create separation</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="q3c" 
                              name="q3" 
                              className="mr-2"
                              checked={quizAnswers.q3 === 'c'}
                              onChange={() => handleQuizAnswer('q3', 'c')}
                            />
                            <label htmlFor="q3c">To mute channels you don't want to hear</label>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        onClick={checkQuizAnswers}
                        disabled={!quizAnswers.q1 || !quizAnswers.q2 || !quizAnswers.q3}
                      >
                        Check Answers
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'help' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Help & Resources</h2>
              <div className="bg-white rounded-lg p-6 shadow text-gray-800">
                <h3 className="text-xl font-semibold mb-3">Frequently Asked Questions</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="border-b pb-3">
                    <h4 className="font-medium mb-2">What type of in-ear monitors should I buy?</h4>
                    <p className="text-gray-600">Custom in-ear monitors are recommended for the best experience, but high-quality universal fit monitors with the right size ear tips can also work well.</p>
                  </div>
                  
                  <div className="border-b pb-3">
                    <h4 className="font-medium mb-2">How do I know if my mix is too loud?</h4>
                    <p className="text-gray-600">If you experience ringing in your ears after use, or if you can't hear someone speaking at a normal volume when wearing your in-ears, your mix is likely too loud.</p>
                  </div>
                  
                  <div className="border-b pb-3">
                    <h4 className="font-medium mb-2">What should I do if I'm experiencing signal dropouts?</h4>
                    <p className="text-gray-600">Check that your wireless pack's antenna is properly attached, and make sure you're within range of the transmitter. If issues persist, consult with your tech team.</p>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">Contact Tech Support</h3>
                <div className="bg-blue-100 p-4 rounded-lg">
                  <p className="mb-2 text-blue-800">Need additional help? Contact your tech team:</p>
                  <button className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    Send Message to Tech Team
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}