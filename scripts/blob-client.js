import { upload } from '@vercel/blob/client';
window.uploadPortfolioMedia=async file=>{
 if(file.size>30000000)throw Error('Maximum upload size is 30 MB.');
 const extension=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','application/pdf':'pdf','video/mp4':'mp4'})[file.type];
 if(!extension)throw Error('Use PNG, JPG, WebP, PDF or MP4.');
 const result=await upload(`media/upload-${crypto.randomUUID()}.${extension}`,file,{access:'private',handleUploadUrl:'/api/upload-token',contentType:file.type,multipart:file.size>4000000});
 return {url:'/api/media?file='+encodeURIComponent(result.pathname)};
};
