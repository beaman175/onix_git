module.exports = {
  "key": process.env.FMS_S3_KEY,
  "secret": process.env.FMS_S3_SECRET,
  "region": "ap-northeast-2",
  "bucket": "onixs3",
  "imageDir": "onix",
  "imageACL": "public-read" //권한
};
