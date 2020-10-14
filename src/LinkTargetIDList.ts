import { formatGUID, readCString, guidFromIDLBytes, readString, readCUnicode } from './util';

enum TargetRoots {
	MyComputer = 'MY_COMPUTER',
}

const TargetRootGuids: Record<string, TargetRoots> = {
	'{20D04FE0-3AEA-1069-A2D8-08002B30309D}': TargetRoots.MyComputer,
	/*
		'{450D8FBA-AD25-11D0-98A8-0800361B1103}': ROOT_MY_DOCUMENTS,
		'{54a754c0-4bf1-11d1-83ee-00a0c90dc849}': ROOT_NETWORK_SHARE,
		'{c0542a90-4bf0-11d1-83ee-00a0c90dc849}': ROOT_NETWORK_SERVER,
		'{208D2C60-3AEA-1069-A2D7-08002B30309D}': ROOT_NETWORK_PLACES,
		'{46e06680-4bf0-11d1-83ee-00a0c90dc849}': ROOT_NETWORK_DOMAIN,
		'{871C5380-42A0-1069-A2EA-08002B30309D}': ROOT_INTERNET,
		'{645FF040-5081-101B-9F08-00AA002F954E}': RECYCLE_BIN,
		'{21EC2020-3AEA-1069-A2DD-08002B30309D}': ROOT_CONTROL_PANEL,
		'{59031A47-3F72-44A7-89C5-5595FE6B30EE}': ROOT_USER,
		'{4234D49B-0245-4DF3-B780-3893943456E1}': ROOT_UWP_APPS,
	*/
};

/**
 * An enumeration of every {@link LinkTargetIDItem} type that we know how to parse
 */
enum LinkTargetIDItemTypes {
	RootEntry = 0x1f,
	DriveLetter = 0x2f,
	Directory = 0x31,
	DirectoryUnicode = 0x35,
	File = 0x32,
	FileUnicode = 0x36,
	UserDirectory = 0x74,
}

class LinkTargetIDItem {
	constructor(
		public itemType: LinkTargetIDItemTypes = LinkTargetIDItemTypes.RootEntry,
		public value: number[] = []
	) {}
}

class LinkTargetIDList {
	public valid = true;
	public items: LinkTargetIDItem[] = [];
	public cachedPath: string | undefined;

	/**
	 * Gets a path from the {@link LinkTargetIDList#items}, and saves it in cachedPath.
	 * @returns the path obtained from the LinkTargetIDItems
	 */
	getPath() {
		let path = '';

		for (let item of this.items) {
			switch (item.itemType) {
				case LinkTargetIDItemTypes.RootEntry:
					let guid = guidFromIDLBytes(item.value);
					let guidString = formatGUID(guid);

					if (Object.keys(TargetRootGuids).includes(guidString)) {
						switch (TargetRootGuids[guidString]) {
							case TargetRoots.MyComputer:
								path += TargetRootGuids[guidString];
								break;
							default:
								path += TargetRootGuids[guidString];
								break;
						}
					}

					break;

				case LinkTargetIDItemTypes.DriveLetter:
					path += item.value
						.slice(0, 3)
						.map((char) => String.fromCharCode(char))
						.join('');
					break;

				case LinkTargetIDItemTypes.Directory:
					// Ignore file size, created/accessed/modified time and file attributes
					let readOffset = 11;

					let shortName = readCString(item.value, readOffset);
					path += `${shortName}\\`;
					break;

				case LinkTargetIDItemTypes.UserDirectory:
					let signature = readString(item.value, 3, 4);

					if (signature === 'CF\0\0') {
						// ZIP file contents
						throw 'Method not implemented';
					} else if (signature === 'CFSF') {
						let folderName = readCString(item.value, 21);
						path += `%USERPROFILE%\\${folderName}\\`;
					} else {
						console.log(signature);
						throw 'Invalid signature!';
					}
					break;

				case LinkTargetIDItemTypes.File:
				case LinkTargetIDItemTypes.Directory:
				case LinkTargetIDItemTypes.FileUnicode:
				case LinkTargetIDItemTypes.DirectoryUnicode:
					let isUnicode =
						item.itemType === LinkTargetIDItemTypes.DirectoryUnicode ||
						item.itemType === LinkTargetIDItemTypes.FileUnicode;
					let isDirectory =
						item.itemType === LinkTargetIDItemTypes.DirectoryUnicode ||
						item.itemType === LinkTargetIDItemTypes.Directory;

					path += (isUnicode ? readCUnicode : readCString)(item.value, 11);

					if (isDirectory) path += '\\';
					break;
			}
		}

		return (this.cachedPath = path);
	}

	/**
	 * Parses a LinkTargetIDList from raw bytes.
	 * @param buffer the buffer containing the raw bytes of the LinkTargetIDList
	 */
	static parse(buffer: Buffer) {
		let linkTargetIDList = new LinkTargetIDList();
		let items: LinkTargetIDItem[] = [];

		let size = buffer.readUIntLE(0, 2);

		// We already read the size, so set this to 2
		let readOffset = 2;
		let remainingBytes = size;

		let shellItemSize = 0;

		// 2 bytes for the terminator
		while (remainingBytes > 2) {
			shellItemSize = buffer.readUInt16LE(readOffset);
			readOffset += 2;

			items.push(
				new LinkTargetIDItem(
					buffer[readOffset],
					Array.from(buffer.slice(readOffset + 1, readOffset + shellItemSize + 1))
				)
			);

			// 2 for the size of the size value
			remainingBytes -= shellItemSize;
			readOffset += shellItemSize - 2;
		}

		linkTargetIDList.items = items;

		return linkTargetIDList;
	}
}

export { LinkTargetIDItem, LinkTargetIDItemTypes, LinkTargetIDList };
export default LinkTargetIDList;
