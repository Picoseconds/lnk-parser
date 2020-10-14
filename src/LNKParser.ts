import LinkTargetIDList from './LinkTargetIDList';
import { dateFromFILETIME, guidFromIDLBytes } from './util';
import HotKeyFlags, { Key, ModifierFlags } from './HotKeyFlags';

/**
 * The only valid header size for a shell link, 0x4C (76).
 */
const VALID_HEADER_SIZE = 0x4c;

/**
 * The number values for a valid link CLSID of {00021401-0000-0000-C000-000000000046}.
 */
const VALID_LINK_CLSID = [136193, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70];

/**
 * An enum covering every possible flag for a FileAttributeFlags int.
 */
enum FileAttributeFlags {
	/**
	 * The file is read only.
	 */
	ReadOnly = 1 << 0,

	/**
	 * The file is hidden and does not show in an ordinary directory listing.
	 */
	Hidden = 1 << 1,

	/**
	 * The file is part of the OS (operating system) or is used exclusively by the OS.
	 */
	System = 1 << 2,

	/**
	 * Must be zero.
	 */
	Reserved1 = 1 << 3,

	/**
	 * The file is a directory.
	 */
	Directory = 1 << 4,

	/**
	 * Used by applications to show that a file must be backed up/archived.
	 */
	Archive = 1 << 5,

	/**
	 * Must be zero.
	 */
	Reserved2 = 1 << 6,

	/**
	 * No other flags are set. If this bit is set, all other flags must be 0.
	 */
	Normal = 1 << 7,

	/**
	 * The file is being used for temporary storage.
	 */
	Temporary = 1 << 8,

	/**
	 * The file is a sparse file.
	 */
	SparseFile = 1 << 9,

	/**
	 * The file is a reparse point.
	 */
	ReparsePoint = 1 << 10,

	/**
	 * The file is compressed.
	 */
	Compressed = 1 << 11,

	/**
	 * The data of the file is unavailable. For example, a network filesystem being offline.
	 */
	Offline = 1 << 12,

	/**
	 * The contents of the file are not to be indexed by Windows search.
	 */
	NotIndexed = 1 << 13,

	/**
	 * The contents of the file are encrypted with the NTFS feature EFS (Encrypted FileSystem).
	 */
	Encrypted = 1 << 14,
}

/**
 * An enum covering every possible flag for a LinkFlags int.
 */
enum LinkFlags {
	/**
	 * The .lnk file contains a LinkTargetIDList structure.
	 */
	HasLinkTargetIDList = 1 << 0,

	/**
	 * The .lnk file contains a LinkInfo structure.
	 */
	HasLinkInfo = 1 << 1,

	/**
	 * The .lnk file contains a NAME_STRING StringData structure.
	 */
	HasName = 1 << 2,

	/**
	 * The .lnk file contains a RELATIVE_PATH StringData structure.
	 */
	HasRelativePath = 1 << 3,

	/**
	 * The .lnk file contains a WORKING_DIR StringData structure.
	 */
	HasWorkingDir = 1 << 4,

	/**
	 * The .lnk file contains a COMMAND_LINE_ARGUMENTS StringData structure.
	 */
	HasArguments = 1 << 5,

	/**
	 * The .lnk file contains a ICON_LOCATION StringData structure.
	 */
	HasIconLocation = 1 << 6,

	/**
	 * The StringData section uses Unicode to encode strings.
	 * If not set, the strings are encoded with the default system codepage.
	 */
	IsUnicode = 1 << 7,

	/**
	 * Ignore the LinkInfo structure.
	 */
	ForceNoLinkInfo = 1 << 8,

	/**
	 * The .lnk file contains an EnvironmentVariableDataBlock.
	 */
	HasExpString = 1 << 9,

	/**
	 * The link target is run in a separate VM (virtual machine) when it is a 16-bit executable running on Windows.
	 */
	RunInSeparateProcess = 1 << 10,

	/**
	 * Undefined bit. Ignore if possible.
	 */
	Unused1 = 1 << 11,

	/**
	 * The .lnk file contains a DarwinDataBlock.
	 */
	HasDarwinID = 1 << 12,

	/**
	 * The target is invoked as another user.
	 */
	RunAsUser = 1 << 13,

	/**
	 * The .lnk file contains an IconEnvironmentDataBlock which points to a custom icon. The icon path can contain environment variables.
	 * @see IconEnvironmentDataBlock
	 */
	HasExpIcon = 1 << 14,

	NoPidlAlias = 1 << 15,

	/**
	 * Undefined bit. Ignore if possible.
	 */
	Unused2 = 1 << 16,

	RunWithShimLayer = 1 << 17,

	ForceNoLinkTrack = 1 << 18,

	EnableTargetMetadata = 1 << 19,

	DisableLinkPathTracking = 1 << 20,

	DisableKnownFolderTracking = 1 << 21,

	DisableKnownFolderAlias = 1 << 21,

	/**
	 * The link is allowed to link to another link.
	 */
	AllowLinkToLink = 1 << 22,

	UnaliasOnSave = 1 << 23,

	PreferEnvironmentPath = 1 << 24,

	KeepLocalIDListForUNCTarget = 1 << 25,
}

/**
 * An enumeration of the possible values for ShowCommand in the shell link header.
 */
enum ShowCommands {
	/**
	 * The window is opened normally and focused.
	 */
	Normal = 0x00000001,

	/**
	 * The window is opened maximized and focused.
	 */
	Maximized = 0x00000003,

	/**
	 * The window is opened minimized and without focus.
	 */
	MinimizedWithoutFocus = 0x00000007,
}

/**
 * Compares two arrays for identity comparison equality (===)
 * @param arr1 the array to compare arr2 with
 * @param arr2 the array to compare arr1 with
 */
function arrayEquals<T>(arr1: Array<T>, arr2: Array<T>) {
	return arr1.length === arr2.length && arr1.every((val, i) => arr2[i] === val);
}

class LNKIcon {
	/**
	 * The location of the file containing the icon.
	 */
	public location = '';

	/**
	 * The index of the icon in the file specified in {@link LNKIcon#location} property.
	 */
	public iconIndex = 0;
}

class LNKFile {
	/**
	 * The header size read from the header. Ignored, should be equal to 0x4C (76).
	 */
	public headerSize = 0x4c;

	/**
	 * The link CLSID obtained from the header. Should be equal to a GUID with a registry-like string of {00021401-0000-0000-C000-000000000046}.
	 */
	public linkCLSID: number[] = Array(11).fill(0);

	/**
	 * A {@link LinkFlags} flags enum value describing the shell link, in particular, what sections follow the header. See Section 2.1.1 of the [MS-SHLLINK] specification.
	 */
	public linkFlags: LinkFlags = 0x0;

	/**
	 * A {@link FileAttributeFlags} flags enum value describing the target.
	 */
	public targetAttributeFlags: FileAttributeFlags = 0x0;

	/**
	 * A Date object containing when the target was created.
	 */
	public targetCreationDate: Date = new Date(0);

	/**
	 * A Date object containing when the target was last accessed.
	 */
	public targetAccessDate: Date = new Date(0);

	/**
	 * A Date object containing when the target was last written to.
	 */
	public targetWriteDate: Date = new Date(0);

	/**
	 * The size of the target. Always 4096 for directories.
	 */
	public targetFileSize: number = 0;

	/**
	 * Whether the {@link LNKFile#headerSize} and {@link LNKFile#linkCLSID} are correct.
	 */
	public valid = true;

	/**
	 * The custom icon assigned to the shell link.
	 */
	public icon: LNKIcon | undefined;

	/**
	 * The ShowCommand used to launch an executable target.
	 */
	public showCommand: ShowCommands = ShowCommands.Normal;

	public hotKey: HotKeyFlags = new HotKeyFlags(Key.None, ModifierFlags.None);

	public target: LinkTargetIDList | string = '';
}

/**
 * A parser for Windows shell links (.lnk files).
 */
class LNKParser {
	/**
	 * The current read cursor for parsing.
	 */
	public offset: number = 0;

	constructor(public buffer: Buffer) {}

	/**
	 * Parses the header from the .lnk file in {@link LNKParser#buffer}.
	 * @param advance whether to advance the read cursor ({@link LNKParser#offset}})
	 * @returns An incomplete LNKFile consisting of only the information in the header. The Icon property will contain an Icon containing only the icon index.
	 */
	parseHeader(advance = true) {
		let lnkFile = new LNKFile();

		let valid = true;
		let readOffset = 0;
		lnkFile.headerSize = this.buffer.readInt32LE(this.offset);
		readOffset += 4;

		if (lnkFile.headerSize !== VALID_HEADER_SIZE) valid = false;

		lnkFile.linkCLSID = this.readGUID_IDL(false, this.offset + readOffset);
		readOffset += 16;

		if (!arrayEquals(lnkFile.linkCLSID, VALID_LINK_CLSID)) valid = false;

		lnkFile.linkFlags = this.buffer.readInt32LE(this.offset + readOffset);
		readOffset += 4;

		lnkFile.targetAttributeFlags = this.buffer.readInt32LE(this.offset + readOffset);
		readOffset += 4;

		lnkFile.targetCreationDate = this.readFileTime(false, this.offset + readOffset);
		readOffset += 8;

		lnkFile.targetAccessDate = this.readFileTime(false, this.offset + readOffset);
		readOffset += 8;

		lnkFile.targetWriteDate = this.readFileTime(false, this.offset + readOffset);
		readOffset += 8;

		lnkFile.targetFileSize = this.buffer.readUInt32LE(this.offset + readOffset);
		readOffset += 4;

		lnkFile.icon = new LNKIcon();
		lnkFile.icon.iconIndex = this.buffer.readInt32LE(this.offset + readOffset);
		readOffset += 4;

		lnkFile.showCommand = this.buffer.readUInt32LE(this.offset + readOffset);
		readOffset += 4;

		if (!Object.values(ShowCommands).includes(lnkFile.showCommand)) {
			lnkFile.showCommand = ShowCommands.Normal;
		}

		lnkFile.hotKey = new HotKeyFlags(this.buffer[this.offset + readOffset], this.buffer[this.offset + readOffset + 1]);

		// Extra 10 due to reserved values that are always zero right after HotKeyFlags
		readOffset += 12;

		lnkFile.target = LinkTargetIDList.parse(this.buffer.slice(this.offset + readOffset));
		lnkFile.target.getPath();

		lnkFile.valid = valid;

		// The header size will always be equal to readOffset and VALID_HEADER_SIZE, as the parse doesn't take into account the value of headerSize.
		if (advance) readOffset += VALID_HEADER_SIZE;

		return lnkFile;
	}

	parse() {
		let lnkFile = this.parseHeader(true);
		return lnkFile;
	}

	/**
	 * Reads a guid in the GUID--RPC IDL representation (see Section 2.3.4.1 of the [MS-DTYP] specification) into a number array.
	 * @param advance whether to advance the read cursor ({@link LNKParser#offset}})
	 * @param location the location at which to read the GUID
	 */
	readGUID_IDL(advance = true, location = this.offset) {
		let guid = this.buffer.slice(location, location + 16);

		if (advance) this.offset += 16;
		return guidFromIDLBytes(guid);
	}

	/**
	 * Reads a Windows FILETIME long into a Date object.
	 * @param advance whether to advance the read cursor ({@link LNKParser#offset}})
	 * @param offset the location at which to read the Windows FILETIME
	 */
	readFileTime(advance = true, offset = this.offset) {
		return dateFromFILETIME(Number(this.buffer.readBigInt64LE(offset)));
	}
}

export { LNKParser };
