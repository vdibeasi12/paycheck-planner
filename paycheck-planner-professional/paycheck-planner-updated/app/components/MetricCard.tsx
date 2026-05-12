interface Props {
  title: string
  value: string
}

export default function MetricCard({ title, value }: Props) {

  return (

    <div className="bg-white p-6 rounded-xl shadow">

      <p className="text-gray-500 text-sm">
        {title}
      </p>

      <p className="text-2xl font-bold mt-2">
        {value}
      </p>

    </div>

  )

}