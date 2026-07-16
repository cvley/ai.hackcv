-- 新增论文/代码解读字段（结构化 JSON）
ALTER TABLE "Item" ADD COLUMN "interpretation" JSONB;
