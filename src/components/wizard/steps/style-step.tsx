"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AudioRecorder } from "@/components/ui/audio-recorder";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Upload,
  Library,
  User,
  Play,
  Pause,
  Loader2,
  Volume2,
  Music,
  FileVideo,
  Check,
  AlertCircle,
} from "lucide-react";

interface VoiceData {
  id: string;
  name: string;
  gender?: string;
  accent?: string;
  description?: string;
  previewUrl?: string;
  category?: string;
  useCase?: string;
}

type VoiceSource = "my_voices" | "recorded" | "uploaded" | "library";

interface SelectedVoice {
  id: string;
  name: string;
  source: VoiceSource;
  previewUrl?: string;
}

export interface StyleStepHandle {
  validate: () => boolean;
  getStyleData: () => {
    voiceId: string;
    voiceName: string;
    voiceSource: VoiceSource;
    musicEnabled: boolean;
    mlsDualOutput: boolean;
  };
}

export const StyleStep = React.forwardRef<StyleStepHandle>((_, ref) => {
  // Voice selection state
  const [selectedVoice, setSelectedVoice] = React.useState<SelectedVoice | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>("library");

  // My Voices tab state
  const [myVoices, setMyVoices] = React.useState<VoiceData[]>([]);
  const [loadingMyVoices, setLoadingMyVoices] = React.useState(false);
  const [myVoicesError, setMyVoicesError] = React.useState<string | null>(null);

  // Library tab state
  const [libraryVoices, setLibraryVoices] = React.useState<VoiceData[]>([]);
  const [loadingLibrary, setLoadingLibrary] = React.useState(false);
  const [libraryError, setLibraryError] = React.useState<string | null>(null);
  const [libraryFilters, setLibraryFilters] = React.useState({
    gender: "all",
    age: "all",
    accent: "all",
    search: "",
  });

  // Record/Upload tab state
  const [voiceName, setVoiceName] = React.useState("");
  const [recordedBlob, setRecordedBlob] = React.useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [isCloning, setIsCloning] = React.useState(false);
  const [cloneError, setCloneError] = React.useState<string | null>(null);

  // Audio preview state
  const [playingVoiceId, setPlayingVoiceId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Toggle states
  const [musicEnabled, setMusicEnabled] = React.useState(true);
  const [mlsDualOutput, setMlsDualOutput] = React.useState(true);

  // Expose validation and data getter via ref
  React.useImperativeHandle(ref, () => ({
    validate: () => {
      return selectedVoice !== null;
    },
    getStyleData: () => ({
      voiceId: selectedVoice?.id || "",
      voiceName: selectedVoice?.name || "",
      voiceSource: selectedVoice?.source || "library",
      musicEnabled,
      mlsDualOutput,
    }),
  }));

  // Fetch user's cloned voices
  const fetchMyVoices = React.useCallback(async () => {
    setLoadingMyVoices(true);
    setMyVoicesError(null);
    try {
      const response = await fetch("/api/voices/my-voices?category=cloned");
      if (!response.ok) throw new Error("Failed to fetch voices");
      const data = await response.json();
      setMyVoices(data.voices || []);
    } catch (error) {
      setMyVoicesError(error instanceof Error ? error.message : "Failed to load voices");
    } finally {
      setLoadingMyVoices(false);
    }
  }, []);

  // Fetch library voices
  const fetchLibraryVoices = React.useCallback(async () => {
    setLoadingLibrary(true);
    setLibraryError(null);
    try {
      const params = new URLSearchParams();
      if (libraryFilters.gender && libraryFilters.gender !== "all") params.set("gender", libraryFilters.gender);
      if (libraryFilters.age && libraryFilters.age !== "all") params.set("age", libraryFilters.age);
      if (libraryFilters.accent && libraryFilters.accent !== "all") params.set("accent", libraryFilters.accent);
      if (libraryFilters.search) params.set("search", libraryFilters.search);
      params.set("page_size", "20");

      const response = await fetch(`/api/voices/library?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch library");
      const data = await response.json();
      setLibraryVoices(data.voices || []);
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Failed to load library");
    } finally {
      setLoadingLibrary(false);
    }
  }, [libraryFilters]);

  // Load voices on tab change
  React.useEffect(() => {
    if (activeTab === "my-voices") {
      fetchMyVoices();
    } else if (activeTab === "library") {
      fetchLibraryVoices();
    }
  }, [activeTab, fetchMyVoices, fetchLibraryVoices]);

  // Create voice clone
  const createVoiceClone = async (blob: Blob, source: "recorded" | "uploaded") => {
    if (!voiceName.trim()) {
      setCloneError("Please enter a name for your voice");
      return;
    }

    setIsCloning(true);
    setCloneError(null);

    try {
      const formData = new FormData();
      formData.append("name", voiceName);
      formData.append("audio", blob, "recording.mp3");
      formData.append("removeBackgroundNoise", "true");

      const response = await fetch("/api/voices/clone", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create voice clone");
      }

      const data = await response.json();

      // Select the new voice
      setSelectedVoice({
        id: data.voice_id,
        name: voiceName,
        source,
      });

      // Reset form
      setVoiceName("");
      setRecordedBlob(null);
      setUploadedFile(null);

      // Refresh my voices list
      fetchMyVoices();

      // Switch to My Voices tab to show the new voice
      setActiveTab("my-voices");
    } catch (error) {
      setCloneError(error instanceof Error ? error.message : "Failed to create voice clone");
    } finally {
      setIsCloning(false);
    }
  };

  // Handle recording complete
  const handleRecordingComplete = (blob: Blob) => {
    setRecordedBlob(blob);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  // Play/pause voice preview
  const togglePreview = (voice: VoiceData) => {
    if (!voice.previewUrl) return;

    if (playingVoiceId === voice.id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = voice.previewUrl;
        audioRef.current.play();
        setPlayingVoiceId(voice.id);
      }
    }
  };

  // Handle audio ended
  const handleAudioEnded = () => {
    setPlayingVoiceId(null);
  };

  // Select a voice
  const selectVoice = (voice: VoiceData, source: VoiceSource) => {
    setSelectedVoice({
      id: voice.id,
      name: voice.name,
      source,
      previewUrl: voice.previewUrl,
    });
  };

  // Voice card component
  const VoiceCard = ({
    voice,
    source,
    isSelected,
  }: {
    voice: VoiceData;
    source: VoiceSource;
    isSelected: boolean;
  }) => (
    <div
      className={`
        relative flex flex-col gap-2 rounded-lg border p-3 transition-all cursor-pointer
        ${isSelected ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/50"}
      `}
      onClick={() => selectVoice(voice, source)}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 rounded-full bg-primary p-1">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{voice.name}</p>
          {voice.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {voice.description}
            </p>
          )}
        </div>
        {voice.previewUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              togglePreview(voice);
            }}
          >
            {playingVoiceId === voice.id ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {voice.gender && (
          <Badge variant="secondary" className="text-xs">
            {voice.gender}
          </Badge>
        )}
        {voice.accent && (
          <Badge variant="secondary" className="text-xs">
            {voice.accent}
          </Badge>
        )}
        {voice.useCase && (
          <Badge variant="outline" className="text-xs">
            {voice.useCase}
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Hidden audio element for previews */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      {/* Voice Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Selection
          </CardTitle>
          <CardDescription>
            Choose a voice for your video narration. Use an existing voice, record your own, or browse the library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="my-voices" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">My Voices</span>
              </TabsTrigger>
              <TabsTrigger value="record" className="gap-2">
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">Record</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger value="library" className="gap-2">
                <Library className="h-4 w-4" />
                <span className="hidden sm:inline">Library</span>
              </TabsTrigger>
            </TabsList>

            {/* My Voices Tab */}
            <TabsContent value="my-voices" className="mt-4">
              {loadingMyVoices ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : myVoicesError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-destructive">{myVoicesError}</p>
                  <Button variant="outline" className="mt-4" onClick={fetchMyVoices}>
                    Try Again
                  </Button>
                </div>
              ) : myVoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No cloned voices yet.
                    <br />
                    Record or upload a sample to create one.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myVoices.map((voice) => (
                    <VoiceCard
                      key={voice.id}
                      voice={voice}
                      source="my_voices"
                      isSelected={selectedVoice?.id === voice.id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Record Tab */}
            <TabsContent value="record" className="mt-4">
              <div className="space-y-4">
                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  minDuration={30}
                  maxDuration={180}
                />

                {recordedBlob && (
                  <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Check className="h-4 w-4" />
                      Recording ready to use
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voice-name-record">Voice Name</Label>
                      <Input
                        id="voice-name-record"
                        placeholder="My Custom Voice"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                      />
                    </div>
                    {cloneError && (
                      <p className="text-sm text-destructive">{cloneError}</p>
                    )}
                    <Button
                      onClick={() => createVoiceClone(recordedBlob, "recorded")}
                      disabled={isCloning || !voiceName.trim()}
                      className="w-full"
                    >
                      {isCloning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Voice Clone...
                        </>
                      ) : (
                        "Create Voice Clone"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload an audio sample (30-60 seconds recommended)
                    <br />
                    MP3, WAV, or WebM format
                  </p>
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="max-w-xs mx-auto"
                  />
                </div>

                {uploadedFile && (
                  <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Check className="h-4 w-4" />
                      File ready: {uploadedFile.name}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voice-name-upload">Voice Name</Label>
                      <Input
                        id="voice-name-upload"
                        placeholder="My Custom Voice"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                      />
                    </div>
                    {cloneError && (
                      <p className="text-sm text-destructive">{cloneError}</p>
                    )}
                    <Button
                      onClick={() => createVoiceClone(uploadedFile, "uploaded")}
                      disabled={isCloning || !voiceName.trim()}
                      className="w-full"
                    >
                      {isCloning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Voice Clone...
                        </>
                      ) : (
                        "Create Voice Clone"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Library Tab */}
            <TabsContent value="library" className="mt-4">
              <div className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Gender</Label>
                    <Select
                      value={libraryFilters.gender}
                      onValueChange={(value) =>
                        setLibraryFilters((prev) => ({ ...prev, gender: value }))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Age</Label>
                    <Select
                      value={libraryFilters.age}
                      onValueChange={(value) =>
                        setLibraryFilters((prev) => ({ ...prev, age: value }))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="young">Young</SelectItem>
                        <SelectItem value="middle_aged">Middle Aged</SelectItem>
                        <SelectItem value="old">Old</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Accent</Label>
                    <Select
                      value={libraryFilters.accent}
                      onValueChange={(value) =>
                        setLibraryFilters((prev) => ({ ...prev, accent: value }))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="american">American</SelectItem>
                        <SelectItem value="british">British</SelectItem>
                        <SelectItem value="australian">Australian</SelectItem>
                        <SelectItem value="indian">Indian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Search</Label>
                    <Input
                      className="h-9"
                      placeholder="Search..."
                      value={libraryFilters.search}
                      onChange={(e) =>
                        setLibraryFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLibraryVoices}
                  disabled={loadingLibrary}
                >
                  {loadingLibrary ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Apply Filters
                </Button>

                {/* Voice Grid */}
                {loadingLibrary ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : libraryError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                    <p className="text-sm text-destructive">{libraryError}</p>
                  </div>
                ) : libraryVoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Library className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No voices found. Try adjusting your filters.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {libraryVoices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        source="library"
                        isSelected={selectedVoice?.id === voice.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selected Voice Display */}
      {selectedVoice && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <Volume2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{selectedVoice.name}</p>
              <p className="text-sm text-muted-foreground">
                Selected voice for narration
              </p>
            </div>
            {selectedVoice.previewUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  togglePreview({
                    id: selectedVoice.id,
                    name: selectedVoice.name,
                    previewUrl: selectedVoice.previewUrl,
                  })
                }
              >
                {playingVoiceId === selectedVoice.id ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Preview
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Video Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Music Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="music-toggle" className="text-base font-medium">
                Background Music
              </Label>
              <p className="text-sm text-muted-foreground">
                Add cinematic background music to your video
              </p>
            </div>
            <Switch
              id="music-toggle"
              checked={musicEnabled}
              onCheckedChange={setMusicEnabled}
            />
          </div>

          {/* MLS Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="mls-toggle" className="text-base font-medium">
                  MLS Dual-Output
                </Label>
                <Badge variant="outline" className="text-xs">Recommended</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Generate both branded and unbranded (MLS-compliant) versions
              </p>
            </div>
            <Switch
              id="mls-toggle"
              checked={mlsDualOutput}
              onCheckedChange={setMlsDualOutput}
            />
          </div>
        </CardContent>
      </Card>

      {/* Validation Warning */}
      {!selectedVoice && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">Please select a voice before proceeding.</p>
        </div>
      )}
    </div>
  );
});

StyleStep.displayName = "StyleStep";
