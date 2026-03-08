import { useState, useCallback } from 'react';
import { scriptAPI, videoAPI, jobAPI, uploadAPI, GenerateScriptPayload, Script } from '@/lib/api';

export const useGenerateScript = () => {
  const [script, setScript] = useState<Script | null>(null);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (payload: GenerateScriptPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await scriptAPI.generate(payload);
      setScript(result.script);
      setScriptId(result.scriptId);
      if (result.imageAnalysis) setImageAnalysis(result.imageAnalysis);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate script';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { script, scriptId, imageAnalysis, isLoading, error, generate };
};


export const useGenerateVideo = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [adFrameUrls, setAdFrameUrls] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (payload: any) => {
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setAdFrameUrls([]);
    try {
      const result = await videoAPI.generate(payload);
      if (result.videoUrl) setVideoUrl(result.videoUrl);
      if (result.adFrameUrls?.length) setAdFrameUrls(result.adFrameUrls);
      if (result.jobId) setJobId(result.jobId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate video';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setVideoUrl(null);
    setAdFrameUrls([]);
    setJobId(null);
    setError(null);
  }, []);

  return { videoUrl, adFrameUrls, jobId, isLoading, error, generate, reset };
};


export const useJobStatus = (jobId: string | null) => {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!jobId) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await jobAPI.getStatus(jobId);
      setStatus(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch job status';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  return { status, isLoading, error, checkStatus };
};

export const useUploadImage = () => {
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await uploadAPI.image(file);
      setUploadUrl(result.url);
      setUploadId(result.uploadId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { uploadUrl, uploadId, isLoading, error, upload };
};

export const useUploadAudio = () => {
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await uploadAPI.audio(file);
      setUploadUrl(result.url);
      setUploadId(result.uploadId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload audio';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { uploadUrl, uploadId, isLoading, error, upload };
};

export const useScriptTemplates = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await scriptAPI.getTemplates();
      setTemplates(result.templates);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { templates, isLoading, error, fetch };
};

export const useLanguages = () => {
  const [languages, setLanguages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await scriptAPI.getLanguages();
      setLanguages(result.languages);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch languages';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { languages, isLoading, error, fetch };
};
