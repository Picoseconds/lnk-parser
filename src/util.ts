/**
 * Obtains a number array from bytes containing a GUID encoded in the GUID--RPC IDL representation (see Section 2.3.4.1 of the [MS-DTYP] specification).
 * @param bytes the bytes to read the GUID from
 */
function guidFromIDLBytes(bytes: number[] | Buffer) {
	return [
		(bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0],
		(bytes[5] << 8) | bytes[4],
		(bytes[7] << 8) | bytes[6],
		...Array.from(bytes.slice(8)),
	];
}

/**
 * Gets a Date object from a Windows FILETIME 64-bit integer.
 * A Windows FILETIME is a 64-bit integer counting the amount of 100-nanosecond intervals that have elapsed since January 1, 1601.
 * @param filetime the Windows FILETIME number
 */
function dateFromFILETIME(filetime: number) {
	return new Date(Number(filetime) / 10000 - 116444736e5 - new Date().getTimezoneOffset() * 60 * 1000);
}

/**
 * Taken from the reference source for the Guid struct in the .NET Framework.
 * @param num the number to convert into a character
 */
function hexToChar(num: number) {
	num = num & 0xf;
	return String.fromCharCode(num > 9 ? num - 10 + 0x61 : num + 0x30);
}

/**
 * Formats a GUID into a "registry-like" string.
 * @param guid the guid to format
 */
function formatGUID(guid: number[]) {
	let data = [
		guid[0] >> 24,
		guid[0] >> 16,
		guid[0] >> 8,
		guid[0],
		guid[1] >> 8,
		guid[1],
		guid[2] >> 8,
		guid[2],
		...guid.slice(3),
	];

	let newData = [];

	for (let i = 0; i < data.length; i++) {
		newData.push(data[i] >> 4, data[i]);
	}

	let hexString = newData.map((num) => hexToChar(num)).join('');

	return `{${hexString.substr(0, 8)}-${hexString.substr(8, 4)}-${hexString.substr(12, 4)}-${hexString.substr(
		16,
		4
	)}-${hexString.slice(20)}}`;
}

/**
 * Reads a null-terminated string from raw bytes.
 * @param buffer the buffer to read the C-style string from
 * @param offset the offset to start reading from
 */
function readCString(buffer: Buffer | number[], offset: number) {
	let string = '';
	let currentChar = '';

	while (currentChar !== '\0') {
		currentChar = String.fromCharCode(buffer[offset]);
		string += currentChar === '\0' ? '' : currentChar;
		offset++;
	}

	return string;
}

/**
 * Reads a null-terminated UTF-16 string from raw bytes.
 * @param buffer the buffer to read the unicode string from
 * @param offset the offset to start reading from
 */
function readCUnicode(buffer: Buffer | number[], offset: number) {
	let string = '';
	let currentChar = '';

	while (currentChar !== '\0') {
		currentChar = String.fromCharCode((buffer[offset + 1] << 8) | buffer[offset]);
		string += currentChar === '\0' ? '' : currentChar;
		offset += 2;
	}

	return string;
}

function readString(buffer: Buffer | number[], offset: number, length: number) {
	let string = '';

	for (let i = offset; i < offset + length; i++) {
		string += String.fromCharCode(buffer[i]);
	}

	return string;
}

export { guidFromIDLBytes, dateFromFILETIME, formatGUID, readCString, readCUnicode, readString };
