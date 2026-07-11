import ItemForm from "@/components/admin/ItemForm";

export default function EditItemPage({ params }: { params: { id: string } }) {
  return (
    <>
      <div className="section-title">
        <span className="bar" />
        编辑条目 · {params.id}
      </div>
      <ItemForm id={params.id} />
    </>
  );
}
