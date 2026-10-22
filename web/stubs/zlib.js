// zlib is only used for library packs (.ukelib), which the web version doesn't make or open
const unavailable = () => { throw new Error('Library packs are not available on the web'); };
module.exports = { deflateRawSync: unavailable, inflateRawSync: unavailable, crc32: unavailable };
