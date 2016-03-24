module.exports = {
  "key": process.env.FMS_S3_KEY,
  "secret": process.env.FMS_S3_SECRET,
  "region": process.env.FMS_S3_REGION,
  "bucket": process.env.FMS_S3_BUCKET,
  "imageDir": process.env.FMS_S3_DIR,
  "imageACL": process.env.FMS_S3_ACL //권한
};
