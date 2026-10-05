import 'package:flutter/material.dart';
import 'catalog.dart';
import 'kmrl_sync.dart';

void main() => runApp(const KmrlApp());

class KmrlApp extends StatelessWidget {
  const KmrlApp({super.key});
  @override Widget build(BuildContext c) => MaterialApp(
    title: 'KMRL Sandbox',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(useMaterial3: true, colorSchemeSeed: const Color(0xFF1565C0), scaffoldBackgroundColor: const Color(0xFFF5F8FC)),
    home: const Root(),
  );
}

class Root extends StatefulWidget {
  const Root({super.key});
  @override State<Root> createState() => _RootState();
}
class _RootState extends State<Root> {
  bool loading = true, authed = false;
  @override void initState(){super.initState(); _check();}
  Future<void> _check() async { authed=await KmrlSync.hasSession(); if(mounted)setState(()=>loading=false); }
  @override Widget build(BuildContext c) {
    if(loading)return const Scaffold(body:Center(child:CircularProgressIndicator()));
    if(!authed)return Login(onDone:()=>setState(()=>authed=true));
    return Home(onSignOut:()async{await KmrlSync.signOut();if(mounted)setState(()=>authed=false);});
  }
}

class Login extends StatefulWidget {
  final VoidCallback onDone;
  const Login({super.key,required this.onDone});
  @override State<Login> createState()=>_LoginState();
}
class _LoginState extends State<Login>{
 final email=TextEditingController(),pass=TextEditingController(); bool busy=false;
 Future<void> go()async{
  setState(()=>busy=true);
  try{await KmrlSync.signIn(email.text.trim(),pass.text);widget.onDone();}
  catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));}
  finally{if(mounted)setState(()=>busy=false);}
 }
 @override Widget build(BuildContext c)=>Scaffold(body:SafeArea(child:Center(child:ConstrainedBox(
  constraints:const BoxConstraints(maxWidth:520),
  child:Padding(padding:const EdgeInsets.all(28),child:Column(mainAxisSize:MainAxisSize.min,children:[
   const Text('⚗ KMRL',style:TextStyle(fontSize:30,fontWeight:FontWeight.w800)),
   const SizedBox(height:8),const Text('KMRL Sandbox',style:TextStyle(fontSize:26,fontWeight:FontWeight.w700)),
   const SizedBox(height:28),
   TextField(controller:email,decoration:const InputDecoration(labelText:'Email',border:OutlineInputBorder())),
   const SizedBox(height:12),
   TextField(controller:pass,obscureText:true,decoration:const InputDecoration(labelText:'Password',border:OutlineInputBorder())),
   const SizedBox(height:18),
   FilledButton(onPressed:busy?null:go,child:Text(busy?'Signing in…':'Sign in'))
  ]))))));
}

class Home extends StatefulWidget {
 final VoidCallback onSignOut;
 const Home({super.key,required this.onSignOut});
 @override State<Home> createState()=>_HomeState();
}
class _HomeState extends State<Home>{
 int tab=0; String query='',subject='All';
 List<StemExperiment> get filtered=>experiments.where((e){
  final q=query.toLowerCase();
  final sm=subject=='All'||e.domain==subject.toUpperCase();
  return sm&&(q.isEmpty||e.id.toLowerCase().contains(q)||e.name.toLowerCase().contains(q)||e.modelId.toLowerCase().contains(q));
 }).toList();

 @override Widget build(BuildContext c)=>Scaffold(
  appBar:AppBar(title:const Text('KMRL SANDBOX'),actions:[IconButton(onPressed:widget.onSignOut,icon:const Icon(Icons.logout))]),
  body:tab==0?_home():_catalog(),
  bottomNavigationBar:NavigationBar(selectedIndex:tab,onDestinationSelected:(v)=>setState(()=>tab=v),
   destinations:const[
    NavigationDestination(icon:Icon(Icons.home_outlined),selectedIcon:Icon(Icons.home),label:'Home'),
    NavigationDestination(icon:Icon(Icons.science_outlined),selectedIcon:Icon(Icons.science),label:'Catalog')
   ])
 );

 Widget _home()=>ListView(padding:const EdgeInsets.all(20),children:[
  Card(child:Padding(padding:const EdgeInsets.all(22),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
   const Text('Learn by doing',style:TextStyle(fontSize:28,fontWeight:FontWeight.w800)),
   const SizedBox(height:8),const Text('Explore · Experiment · Measure · Learn'),
   const SizedBox(height:18),FilledButton.icon(onPressed:()=>setState(()=>tab=1),icon:const Icon(Icons.play_arrow),label:const Text('Start New Experiment'))
  ]))),
  const SizedBox(height:14),
  Card(child:ListTile(onTap:()=>setState(()=>tab=1),leading:const CircleAvatar(child:Icon(Icons.menu_book)),title:const Text('STEM Catalog'),subtitle:const Text('45 governed experiments'),trailing:const Icon(Icons.chevron_right))),
  const Card(child:ListTile(leading:CircleAvatar(child:Icon(Icons.cloud_done)),title:Text('Sync Status'),subtitle:Text('Online · Ready to sync'))),
  const SizedBox(height:18),const Text('Choose a subject',style:TextStyle(fontSize:20,fontWeight:FontWeight.w700)),
  Row(children:['Physics','Chemistry','Mathematics'].map((s)=>Expanded(child:Card(child:Padding(padding:const EdgeInsets.all(10),child:Text('$s\n15 experiments',textAlign:TextAlign.center))))).toList()),
  Card(child:ListTile(leading:const Icon(Icons.verified),title:const Text('Catalog source ready'),subtitle:Text(approvedWorkbook)))
 ]);

 Widget _catalog()=>Column(children:[
  Padding(padding:const EdgeInsets.all(16),child:TextField(onChanged:(v)=>setState(()=>query=v),decoration:const InputDecoration(prefixIcon:Icon(Icons.search),hintText:'Search experiments…',border:OutlineInputBorder()))),
  SizedBox(height:48,child:ListView(scrollDirection:Axis.horizontal,padding:const EdgeInsets.symmetric(horizontal:12),children:
   ['All','Physics','Chemistry','Mathematics'].map((s)=>Padding(padding:const EdgeInsets.symmetric(horizontal:4),child:
    ChoiceChip(label:Text(s),selected:subject==s,onSelected:(_)=>setState(()=>subject=s)))).toList())),
  Expanded(child:ListView.builder(itemCount:filtered.length,itemBuilder:(c,i){
   final e=filtered[i];
   return Card(margin:const EdgeInsets.symmetric(horizontal:12,vertical:4),child:ListTile(
    leading:CircleAvatar(child:Text(e.domain[0])),title:Text(e.name),subtitle:Text(e.id+' · '+e.modelId),trailing:const Icon(Icons.chevron_right),
    onTap:()=>showDialog(context:context,builder:(_)=>AlertDialog(
     title:Text(e.name),content:Text(e.id+'\n'+e.domain+'\nModel: '+e.modelId+'\n\nWorkspace is the next Flutter build stage.'),
     actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('OK'))]))));
  }))
 ]);
}
