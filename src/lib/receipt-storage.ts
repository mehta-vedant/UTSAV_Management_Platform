import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { InvariantError } from "@/lib/errors";
import {
    RECEIPT_ALLOWED_CONTENT_TYPES,
    RECEIPT_MAX_BYTES,
    type ReceiptContentType,
} from "@/lib/receipt-constraints";

export { RECEIPT_ALLOWED_CONTENT_TYPES, RECEIPT_MAX_BYTES, type ReceiptContentType } from "@/lib/receipt-constraints";

function getReceiptBucket() {
    const bucket = process.env.S3_RECEIPTS_BUCKET;
    if (!bucket) throw new InvariantError("Receipt storage is not configured yet. Please try again later.");
    return bucket;
}

function getS3Client() {
    const region = process.env.AWS_REGION;
    if (!region) throw new InvariantError("Receipt storage is not configured yet. Please try again later.");
    return new S3Client({ region });
}

export function isReceiptStorageConfigured() {
    return Boolean(process.env.S3_RECEIPTS_BUCKET && process.env.AWS_REGION);
}

export function isReceiptContentType(value: string): value is ReceiptContentType {
    return RECEIPT_ALLOWED_CONTENT_TYPES.includes(value as ReceiptContentType);
}

export async function createReceiptUploadPost(input: {
    objectKey: string;
    contentType: ReceiptContentType;
}) {
    const bucket = getReceiptBucket();
    const prefix = input.objectKey.split("/").slice(0, -1).join("/") + "/";
    return createPresignedPost(getS3Client(), {
        Bucket: bucket,
        Key: input.objectKey,
        Expires: 300,
        Fields: {
            "Content-Type": input.contentType,
            "x-amz-server-side-encryption": "AES256",
        },
        Conditions: [
            ["content-length-range", 1, RECEIPT_MAX_BYTES],
            { "Content-Type": input.contentType },
            { "x-amz-server-side-encryption": "AES256" },
            ["starts-with", "$key", prefix],
        ],
    });
}

export async function inspectReceiptObject(objectKey: string) {
    const response = await getS3Client().send(new HeadObjectCommand({
        Bucket: getReceiptBucket(),
        Key: objectKey,
    }));
    return {
        byteSize: response.ContentLength || 0,
        contentType: response.ContentType || "",
    };
}

export async function createReceiptDownloadUrl(objectKey: string) {
    return getSignedUrl(
        getS3Client(),
        new GetObjectCommand({ Bucket: getReceiptBucket(), Key: objectKey }),
        { expiresIn: 120 }
    );
}

export async function deleteReceiptObject(objectKey: string) {
    await getS3Client().send(new DeleteObjectCommand({
        Bucket: getReceiptBucket(),
        Key: objectKey,
    }));
}

export async function readReceiptBytes(objectKey: string) {
    const response = await getS3Client().send(new GetObjectCommand({
        Bucket: getReceiptBucket(),
        Key: objectKey,
    }));
    if (!response.Body) throw new InvariantError("The uploaded receipt could not be read.");
    return response.Body.transformToByteArray();
}

/** A small content-signature check prevents a renamed executable/text file from
 * being accepted merely because its browser supplied a permitted MIME type.
 * It is intentionally not presented as malware scanning. */
export function hasExpectedReceiptSignature(contentType: ReceiptContentType, bytes: Uint8Array) {
    const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value);
    if (contentType === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
    if (contentType === "image/png") return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    if (contentType === "image/webp") return startsWith(0x52, 0x49, 0x46, 0x46) && startsWithAt(bytes, 8, 0x57, 0x45, 0x42, 0x50);
    return startsWith(0x25, 0x50, 0x44, 0x46, 0x2d); // %PDF-
}

function startsWithAt(bytes: Uint8Array, offset: number, ...values: number[]) {
    return values.every((value, index) => bytes[offset + index] === value);
}
