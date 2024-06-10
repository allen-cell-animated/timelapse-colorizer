// Adapted from https://web.dev/patterns/files/open-a-directory by Thomas Steiner.

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string | number;
      mode?: "read" | "readwrite";
      startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

// Feature detection. The API needs to be supported
// and the app not run in an iframe.
export const supportsFileSystemAccess =
  window.showDirectoryPicker &&
  (() => {
    try {
      return window.self === window.top;
    } catch {
      return false;
    }
  })();



// Recursive function that walks the directory structure.
const getFiles = async (
  dirHandle: FileSystemDirectoryHandle,
  path = dirHandle.name
): Promise<File[]> => {
  const dirs: Promise<File[]>[] = [];
  const files: File[] = [];
  
  for await (const entry of dirHandle.values()) {
    const nestedPath = `${path}/${entry.name}`;
    if (entry.kind === "file") {
      files.push(
        entry.getFile().then((file) => {
          file.directoryHandle = dirHandle;
          file.handle = entry;
          return Object.defineProperty(file, "webkitRelativePath", {
            configurable: true,
            enumerable: true,
            get: () => nestedPath,
          });
        })
      );
    } else if (entry.kind === "directory") {
      dirs.push(getFiles(entry, nestedPath));
    }
  }

  return [...(await Promise.all(dirs)).flat(), ...(await Promise.all(files))];
};

const getFolderName = (path: string): string => {
  return path.substring(0, path.indexOf("/"));
}

// TODO: Make the file list a nested dict to reduce the amount of repeated strings?
const fileListToFileMap = (files: File[]): Record<string, File> => {
  const fileMap: Record<string, File> = {};

  for (const file of files) {
    let path = file.webkitRelativePath;
    // Strip directory name from the path
    path = path.substring(path.indexOf("/") + 1);
    fileMap[path] = file;
  }
  return fileMap;
};

/**
 * Creates a file picker dialog to select a directory and returns a list of files (as File objects)
 * within the directory.
 */
const openDirectoryAndGetFileList = async (mode: "read" | "readwrite" = "read" ): Promise<File[]> => {
  // If the File System Access API is supported…
  if (window.showDirectoryPicker && supportsFileSystemAccess) {
    try {
      // Open the directory.
      const handle = await window.showDirectoryPicker({
        mode,
      });
      // Get the directory structure.
      return await getFiles(handle, undefined);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error(err.name, err.message);
      }
    }
  }

  // Fallback if the File System Access API is not supported.
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;

    input.addEventListener("change", () => {
      console.log(input);
      let files = Array.from(input.files || []);
      resolve(files);
    });
    if ("showPicker" in HTMLInputElement.prototype) {
      input.showPicker();
    } else {
      input.click();
    }
  });
};

export const openDirectory = async (mode = "read"): Promise<{folderName: string, fileMap: Record<string, File>}> => {\
  const files = await openDirectoryAndGetFileList(mode);
  const fileMap = fileListToFileMap(files);
  const folderName = getFolderName(files[0].webkitRelativePath);
  return {folderName, fileMap};
};
